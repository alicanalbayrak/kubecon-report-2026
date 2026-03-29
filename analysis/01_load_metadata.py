"""Flatten both index.json files into a unified event list."""

import hashlib
import json
import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOURCES = [
    {
        "path": os.path.join(REPO_ROOT, "kubecon-cloudnative-eu-2026", "kubecon_eu_2026_slides", "index.json"),
        "source": "main",
        "slides_dir": os.path.join(REPO_ROOT, "kubecon-cloudnative-eu-2026", "kubecon_eu_2026_slides"),
    },
    {
        "path": os.path.join(REPO_ROOT, "cncf-hosted-co-located-events-eu-2026", "colocated_eu_2026_slides", "index.json"),
        "source": "colocated",
        "slides_dir": os.path.join(REPO_ROOT, "cncf-hosted-co-located-events-eu-2026", "colocated_eu_2026_slides"),
    },
]

EMOJI_RE = re.compile(
    r"^[\U0001f300-\U0001f9ff\u2600-\u27bf\u200d\ufe0f\u2764\u23cf-\u23fa\u25aa-\u25fe]+\s*",
)


def strip_emoji_prefix(text: str) -> str:
    return EMOJI_RE.sub("", text).strip()


def make_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:12]


def resolve_files(files: list, slides_dir: str) -> list:
    resolved = []
    for f in files:
        resolved.append({
            "url": f["url"],
            "filename": f["filename"],
            "local_path": f["local_path"],
            "absolute_path": os.path.join(slides_dir, f["local_path"]),
        })
    return resolved


def load_source(source_cfg: dict) -> list:
    with open(source_cfg["path"]) as f:
        data = json.load(f)

    events = []
    for type_name, type_data in data["types"].items():
        category = strip_emoji_prefix(type_name)
        for event in type_data["events"]:
            events.append({
                "id": make_id(event["url"]),
                "url": event["url"],
                "source": source_cfg["source"],
                "category": category,
                "title": event.get("title", ""),
                "description": event.get("description", ""),
                "date_time": event.get("date_time", ""),
                "venue": event.get("venue", ""),
                "experience_level": event.get("experience_level", ""),
                "speakers": event.get("speakers", []),
                "files": resolve_files(event.get("files", []), source_cfg["slides_dir"]),
                "start_date": event.get("start_date", ""),
                "end_date": event.get("end_date", ""),
            })
    return events


def main():
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
    os.makedirs(cache_dir, exist_ok=True)

    all_events = []
    for source_cfg in SOURCES:
        events = load_source(source_cfg)
        print(f"Loaded {len(events)} events from {source_cfg['source']}")
        all_events.extend(events)

    print(f"Total: {len(all_events)} events")

    out_path = os.path.join(cache_dir, "events_unified.json")
    with open(out_path, "w") as f:
        json.dump(all_events, f, indent=2)
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
