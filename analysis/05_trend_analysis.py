"""Trend analysis: category depth, tech mentions, cross-mapped pairs, keyword clusters."""

import json
import os
import re
from collections import Counter, defaultdict

import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

CATEGORY_PAIRS = [
    ("Security", "Open Source SecurityCon"),
    ("Observability", "Observability Day"),
    ("Platform Engineering", "Platform Engineering Day"),
    ("AI + ML", "Cloud Native AI + Kubeflow Day"),
    ("Connectivity", "CiliumCon"),
    ("Application Development", "BackstageCon"),
    ("Operations + Performance", "FluxCon"),
    ("Data Processing + Storage", "WasmCon"),
]

TECH_TERMS = {
    "eBPF": r"\bebpf\b",
    "WebAssembly/Wasm": r"\b(?:wasm|webassembly)\b",
    "GitOps": r"\bgitops\b",
    "Service Mesh": r"\bservice\s*mesh\b",
    "Sidecar": r"\bsidecar\b",
    "Gateway API": r"\bgateway\s*api\b",
    "Envoy": r"\benvoy\b",
    "Istio": r"\bistio\b",
    "Cilium": r"\bcilium\b",
    "ArgoCD": r"\bargo\s*cd\b",
    "Argo Workflows": r"\bargo\s*workflows?\b",
    "Flux": r"\bflux(?:cd)?\b",
    "Backstage": r"\bbackstage\b",
    "Crossplane": r"\bcrossplane\b",
    "Kyverno": r"\bkyverno\b",
    "OPA/Gatekeeper": r"\b(?:opa|gatekeeper|open\s*policy\s*agent)\b",
    "Prometheus": r"\bprometheus\b",
    "OpenTelemetry": r"\bopentelemetry\b",
    "Grafana": r"\bgrafana\b",
    "Helm": r"\bhelm\b",
    "Terraform": r"\bterraform\b",
    "OpenTofu": r"\bopentofu\b",
    "KubeVirt": r"\bkubevirt\b",
    "Operator Pattern": r"\boperator\s*(?:pattern|framework|sdk)\b",
    "LLM/Large Language Model": r"\b(?:llm|large\s*language\s*model)s?\b",
    "RAG": r"\brag\b",
    "AI Agent": r"\b(?:ai|agentic)\s*agents?\b",
    "MCP": r"\bmcp\b",
    "GPU Scheduling": r"\bgpu\s*schedul",
    "vLLM": r"\bvllm\b",
    "KubeRay": r"\bkuberay\b",
    "Kubeflow": r"\bkubeflow\b",
    "SBOM": r"\bsboms?\b",
    "Supply Chain Security": r"\bsupply\s*chain\s*security\b",
    "Zero Trust": r"\bzero\s*trust\b",
    "Platform Engineering": r"\bplatform\s*engineering\b",
    "Internal Developer Platform": r"\b(?:idp|internal\s*developer\s*platform)\b",
    "Keycloak": r"\bkeycloak\b",
    "SPIFFE/SPIRE": r"\b(?:spiffe|spire)\b",
}


def load_data():
    with open(os.path.join(CACHE_DIR, "events_unified.json")) as f:
        events = json.load(f)
    with open(os.path.join(CACHE_DIR, "slide_texts.json")) as f:
        slide_texts = json.load(f)
    with open(os.path.join(CACHE_DIR, "category_keywords.json")) as f:
        category_keywords = json.load(f)
    with open(os.path.join(CACHE_DIR, "event_keywords.json")) as f:
        event_keywords = json.load(f)
    return events, slide_texts, category_keywords, event_keywords


def category_depth_matrix(events, slide_texts):
    by_cat = defaultdict(list)
    for e in events:
        by_cat[e["category"]].append(e)
    matrix = []
    for cat, cat_events in sorted(by_cat.items()):
        desc_lengths = [len(e.get("description", "")) for e in cat_events]
        page_counts = []
        events_with_slides = 0
        multi_speaker = 0
        for e in cat_events:
            if len(e.get("speakers", [])) > 1:
                multi_speaker += 1
            if e.get("files"):
                events_with_slides += 1
                for fi in e["files"]:
                    slide = slide_texts.get(fi.get("local_path", ""), {})
                    if slide.get("page_count"):
                        page_counts.append(slide["page_count"])
        source = cat_events[0]["source"] if cat_events else "unknown"
        matrix.append({
            "category": cat,
            "source": source,
            "event_count": len(cat_events),
            "avg_description_length": round(np.mean(desc_lengths)) if desc_lengths else 0,
            "avg_slide_pages": round(np.mean(page_counts), 1) if page_counts else 0,
            "pct_with_slides": round(events_with_slides / len(cat_events) * 100, 1),
            "pct_multi_speaker": round(multi_speaker / len(cat_events) * 100, 1),
        })
    return matrix


def build_full_text(event, slide_texts):
    parts = [event.get("title", ""), event.get("description", "")]
    for fi in event.get("files", []):
        slide = slide_texts.get(fi.get("local_path", ""), {})
        if slide.get("text"):
            parts.append(slide["text"])
    return " ".join(parts)


# Pre-compile tech term regexes once
TECH_REGEXES = {name: re.compile(pattern, re.IGNORECASE) for name, pattern in TECH_TERMS.items()}


def tech_mention_frequency(events, slide_texts):
    # Pre-build full text per event once
    event_texts = {e["source"]: [] for e in events}
    for e in events:
        event_texts.setdefault(e["source"], []).append(build_full_text(e, slide_texts).lower())

    results = {"main": {}, "colocated": {}}
    for source in ["main", "colocated"]:
        texts = event_texts.get(source, [])
        total = len(texts)
        for tech_name, regex in TECH_REGEXES.items():
            count = sum(1 for t in texts if regex.search(t))
            results[source][tech_name] = {
                "count": count,
                "pct": round(count / total * 100, 1) if total else 0,
            }
    return results


def cross_mapped_pairs(events, category_keywords):
    pairs = []
    for main_cat, coloc_cat in CATEGORY_PAIRS:
        main_kws = {kw["term"] for kw in category_keywords.get(main_cat, [])}
        coloc_kws = {kw["term"] for kw in category_keywords.get(coloc_cat, [])}
        if not main_kws and not coloc_kws:
            continue
        overlap = main_kws & coloc_kws
        main_unique = main_kws - coloc_kws
        coloc_unique = coloc_kws - main_kws
        main_events = [e for e in events if e["category"] == main_cat]
        coloc_events = [e for e in events if e["category"] == coloc_cat]
        pairs.append({
            "main_category": main_cat,
            "colocated_category": coloc_cat,
            "main_event_count": len(main_events),
            "colocated_event_count": len(coloc_events),
            "keyword_overlap": sorted(overlap),
            "main_unique_keywords": sorted(main_unique)[:10],
            "colocated_unique_keywords": sorted(coloc_unique)[:10],
            "overlap_pct": round(len(overlap) / max(len(main_kws | coloc_kws), 1) * 100, 1),
        })
    return pairs


def keyword_cooccurrence_clusters(event_keywords, top_n=100):
    keyword_freq = Counter()
    for keywords in event_keywords.values():
        for kw in keywords:
            keyword_freq[kw["term"]] += 1
    top_keywords = [term for term, _ in keyword_freq.most_common(top_n)]
    kw_to_idx = {kw: i for i, kw in enumerate(top_keywords)}
    n = len(top_keywords)
    cooccurrence = np.zeros((n, n), dtype=int)
    for keywords in event_keywords.values():
        event_terms = [kw["term"] for kw in keywords if kw["term"] in kw_to_idx]
        for i, t1 in enumerate(event_terms):
            for t2 in event_terms[i + 1:]:
                idx1, idx2 = kw_to_idx[t1], kw_to_idx[t2]
                cooccurrence[idx1][idx2] += 1
                cooccurrence[idx2][idx1] += 1
    threshold = max(3, np.percentile(cooccurrence[cooccurrence > 0], 75)) if cooccurrence.any() else 3
    visited = set()
    clusters = []
    def bfs(start):
        cluster = set()
        queue = [start]
        while queue:
            node = queue.pop(0)
            if node in visited:
                continue
            visited.add(node)
            cluster.add(node)
            for neighbor in range(n):
                if neighbor not in visited and cooccurrence[node][neighbor] >= threshold:
                    queue.append(neighbor)
        return cluster
    for i in range(n):
        if i not in visited:
            cluster = bfs(i)
            if len(cluster) >= 2:
                cluster_terms = sorted([top_keywords[idx] for idx in cluster])
                clusters.append({"terms": cluster_terms, "size": len(cluster_terms)})
    clusters.sort(key=lambda c: c["size"], reverse=True)
    return clusters


def main():
    events, slide_texts, category_keywords, event_keywords = load_data()
    print(f"Loaded {len(events)} events, {len(slide_texts)} slide texts")
    print("Computing category depth matrix...")
    depth_matrix = category_depth_matrix(events, slide_texts)
    print(f"  {len(depth_matrix)} categories")
    print("Computing tech mention frequency...")
    tech_mentions = tech_mention_frequency(events, slide_texts)
    main_top = sorted(tech_mentions["main"].items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    top_main_str = ", ".join(f"{t[0]}({t[1]['count']})" for t in main_top)
    print(f"  Top main: {top_main_str}")
    print("Computing cross-mapped pairs...")
    pairs = cross_mapped_pairs(events, category_keywords)
    print(f"  {len(pairs)} pairs")
    print("Computing keyword clusters...")
    clusters = keyword_cooccurrence_clusters(event_keywords)
    print(f"  {len(clusters)} clusters")
    findings = {
        "category_depth_matrix": depth_matrix,
        "tech_mentions": tech_mentions,
        "category_pairs": pairs,
        "keyword_clusters": clusters,
    }
    out_path = os.path.join(CACHE_DIR, "trend_findings.json")
    with open(out_path, "w") as f:
        json.dump(findings, f, indent=2)
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
