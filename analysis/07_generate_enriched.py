"""Assemble all cache outputs into view-oriented enriched.json."""

import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

AI_TERMS = re.compile(
    r"\b(?:ai|artificial\s*intelligence|machine\s*learning|ml|llm|"
    r"large\s*language\s*model|deep\s*learning|neural|gpt|"
    r"rag|retrieval\s*augmented|inference|training|gpu|"
    r"vllm|kuberay|kubeflow|agentic|ai\s*agent|mcp)\b",
    re.IGNORECASE,
)

ARCH_PATTERNS = {
    "Sidecar": re.compile(r"\bsidecar\b", re.IGNORECASE),
    "Gateway": re.compile(r"\bgateway\b", re.IGNORECASE),
    "Operator": re.compile(r"\boperator\b", re.IGNORECASE),
    "GitOps": re.compile(r"\bgitops\b", re.IGNORECASE),
    "Service Mesh": re.compile(r"\bservice\s*mesh\b", re.IGNORECASE),
    "Zero Trust": re.compile(r"\bzero\s*trust\b", re.IGNORECASE),
    "Platform Engineering": re.compile(r"\bplatform\s*engineering\b", re.IGNORECASE),
    "Internal Developer Platform": re.compile(r"\b(?:idp|internal\s*developer\s*platform)\b", re.IGNORECASE),
    "Multi-Cluster": re.compile(r"\bmulti.?cluster\b", re.IGNORECASE),
    "FinOps": re.compile(r"\bfinops\b", re.IGNORECASE),
}


def load_cache():
    data = {}
    files = [
        "events_unified.json",
        "slide_texts.json",
        "event_keywords.json",
        "category_keywords.json",
        "trend_findings.json",
        "org_findings.json",
        "company_map.json",
    ]
    for filename in files:
        path = os.path.join(CACHE_DIR, filename)
        with open(path) as f:
            key = filename.replace(".json", "")
            data[key] = json.load(f)
    return data


def compute_ai_and_arch_patterns(events, slide_texts):
    """Single pass over events to compute both AI penetration and architecture patterns."""
    ai_by_track = defaultdict(lambda: {"total": 0, "ai_count": 0})
    arch_by_track = defaultdict(Counter)

    for event in events:
        cat = event["category"]
        ai_by_track[cat]["total"] += 1

        parts = [event.get("title", ""), event.get("description", "")]
        for fi in event.get("files", []):
            slide = slide_texts.get(fi.get("local_path", ""), {})
            if slide.get("text"):
                parts.append(slide["text"])
        full_text = " ".join(parts)

        if AI_TERMS.search(full_text):
            ai_by_track[cat]["ai_count"] += 1

        for pattern_name, regex in ARCH_PATTERNS.items():
            if regex.search(full_text):
                arch_by_track[cat][pattern_name] += 1

    ai_result = {}
    for cat, counts in sorted(ai_by_track.items()):
        if counts["total"] > 0:
            ai_result[cat] = {
                "total_events": counts["total"],
                "ai_events": counts["ai_count"],
                "ai_pct": round(counts["ai_count"] / counts["total"] * 100, 1),
            }

    arch_result = {}
    for cat in sorted(arch_by_track.keys()):
        arch_result[cat] = dict(arch_by_track[cat].most_common())

    return ai_result, arch_result


def build_enriched_events(events, event_keywords, slide_texts):
    enriched = []
    for event in events:
        slide_chars = 0
        slide_pages = 0
        for fi in event.get("files", []):
            slide = slide_texts.get(fi.get("local_path", ""), {})
            slide_chars += slide.get("char_count", 0)
            slide_pages += slide.get("page_count", 0)
        keywords = event_keywords.get(event["id"], [])
        enriched.append({
            "id": event["id"],
            "source": event["source"],
            "category": event["category"],
            "title": event["title"],
            "experience_level": event.get("experience_level", ""),
            "companies_normalized": event.get("companies_normalized", []),
            "speaker_count": len(event.get("speakers", [])),
            "has_slides": bool(event.get("files")),
            "slide_char_count": slide_chars,
            "slide_page_count": slide_pages,
            "keywords": [kw["term"] for kw in keywords[:10]],
            "start_date": event.get("start_date", ""),
        })
    return enriched


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    cache = load_cache()
    events = cache["events_unified"]
    slide_texts = cache["slide_texts"]
    event_keywords = cache["event_keywords"]
    trend_findings = cache["trend_findings"]
    org_findings = cache["org_findings"]

    print("Computing AI penetration and architecture patterns...")
    ai_penetration, arch_patterns = compute_ai_and_arch_patterns(events, slide_texts)

    print("Building enriched events...")
    enriched_events = build_enriched_events(events, event_keywords, slide_texts)

    slides_with_text = sum(1 for v in slide_texts.values() if v.get("success"))

    enriched = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "event_count": len(events),
            "slide_count": len(slide_texts),
            "slides_with_text": slides_with_text,
            "pipeline_version": "2.0",
        },
        "org_leaderboard": {
            "top_companies": org_findings["org_leaderboard"],
            "company_classifications": org_findings["company_classifications"],
        },
        "keyword_trends": {
            "by_category": cache["category_keywords"],
            "tech_mentions": trend_findings["tech_mentions"],
            "keyword_clusters": trend_findings["keyword_clusters"],
        },
        "ai_penetration": {
            "by_track": ai_penetration,
        },
        "category_depth_matrix": trend_findings["category_depth_matrix"],
        "category_pairs": trend_findings["category_pairs"],
        "architecture_patterns": {
            "by_track": arch_patterns,
        },
        "track_enduser_ratio": org_findings["track_enduser_ratio"],
        "company_topic_heatmap": org_findings["company_topic_heatmap"],
        "events": enriched_events,
    }

    out_path = os.path.join(OUTPUT_DIR, "enriched.json")
    with open(out_path, "w") as f:
        json.dump(enriched, f, indent=2)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"Written to {out_path} ({size_mb:.1f} MB)")
    print(f"Top-level keys: {list(enriched.keys())}")


if __name__ == "__main__":
    main()
