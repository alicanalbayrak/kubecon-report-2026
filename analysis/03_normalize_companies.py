"""Extract and normalize company names from event metadata."""

import json
import os
import re

from thefuzz import fuzz

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

ALIASES = {
    "Google Cloud": "Google",
    "Google LLC": "Google",
    "Red Hat, Inc.": "Red Hat",
    "Red Hat Inc.": "Red Hat",
    "VMware by Broadcom": "Broadcom",
    "VMware": "Broadcom",
    "Microsoft Azure": "Microsoft",
    "Amazon Web Services (AWS)": "AWS",
    "Amazon Web Services": "AWS",
    "Amazon": "AWS",
    "SUSE LLC": "SUSE",
    "Suse": "SUSE",
    "IBM Research": "IBM",
    "Apple Inc.": "Apple",
    "Huawei Technologies": "Huawei",
    "Huawei Cloud": "Huawei",
    "Meta Platforms": "Meta",
    "SAP SE": "SAP",
    "Alibaba Cloud": "Alibaba",
    "Deutsche Telekom AG": "Deutsche Telekom",
    "Intuit Inc.": "Intuit",
    "Cisco Systems": "Cisco",
    "Cisco Systems, Inc.": "Cisco",
    "NVIDIA Corporation": "NVIDIA",
    "Intel Corporation": "Intel",
    "Accenture plc": "Accenture",
    "Shopify Inc.": "Shopify",
    "Datadog, Inc.": "Datadog",
    "Datadog Inc.": "Datadog",
    "Kong Inc.": "Kong",
    "Kong Inc": "Kong",
    "Isovalent (now part of Cisco)": "Cisco",
    "Buoyant, Inc.": "Buoyant",
    "Tetrate.io": "Tetrate",
    "Data Dog": "Datadog",
    "Grafana Laba": "Grafana Labs",
    "Isovalent at Cisco": "Cisco",
    "HUAWEI": "Huawei",
    "Bloomberg LP": "Bloomberg",
    "Honeycomb.io": "Honeycomb",
    "The Linux Foundation": "Linux Foundation",
}

FUZZY_THRESHOLD = 85

# Names that are clearly not companies — extracted from title parsing noise
NOISE_NAMES = {
    "Maintainer", "Independent", "Ltd.", "Inc.", "Co-Chairs",
    "Program Committee Co-Chairs", "Program Committee Co-Chair",
    "Co.", "LLC",
}

SKIP_PATTERNS = [
    re.compile(r"(?i)^(coffee|lunch|break|keynote|registration|party|social|reception)"),
    re.compile(r"(?i)(SEPARATE REGISTRATION|ALL ACCESS|FULL.DAY)"),
]


def extract_company_from_title(title: str) -> list[str]:
    if " - " not in title:
        return []
    suffix = title.rsplit(" - ", 1)[1]
    companies = []
    segments = re.split(r";\s*", suffix)
    for segment in segments:
        parts = re.split(r"\s+&\s+", segment)
        if len(parts) > 1 and all("," in p for p in parts):
            for part in parts:
                company = part.rsplit(",", 1)[-1].strip()
                if company:
                    companies.append(company)
        else:
            full = segment.strip()
            if "," in full:
                company = full.rsplit(",", 1)[-1].strip()
                if company:
                    companies.append(company)
    return companies


def extract_company_from_speaker_title(speaker_title: str) -> str:
    if not speaker_title or "," not in speaker_title:
        return ""
    company = speaker_title.rsplit(",", 1)[-1].strip()
    return company


def is_noise(name: str) -> bool:
    return name in NOISE_NAMES or len(name) <= 2


def normalize(name: str) -> str:
    name = name.strip()
    if name in ALIASES:
        return ALIASES[name]
    return name


def should_skip_event(event: dict) -> bool:
    title = event.get("title", "")
    for pattern in SKIP_PATTERNS:
        if pattern.search(title):
            return True
    return False


def build_fuzzy_groups(raw_names: list[str]) -> dict[str, str]:
    canonical = {}
    groups = []
    for name in sorted(raw_names, key=lambda n: (-len(n), n)):
        matched = False
        for i, (canon, members) in enumerate(groups):
            if fuzz.token_sort_ratio(name, canon) >= FUZZY_THRESHOLD:
                canonical[name] = canon
                members.append(name)
                matched = True
                break
        if not matched:
            canonical[name] = name
            groups.append((name, [name]))
    return canonical


def main():
    events_path = os.path.join(CACHE_DIR, "events_unified.json")
    with open(events_path) as f:
        events = json.load(f)

    raw_companies_per_event = {}
    all_raw_names = set()

    for event in events:
        if should_skip_event(event):
            continue
        companies = set()
        title_companies = extract_company_from_title(event["title"])
        for c in title_companies:
            if not is_noise(c):
                companies.add(c)
        if not companies:
            for speaker in event.get("speakers", []):
                c = extract_company_from_speaker_title(speaker.get("title", ""))
                if c and not is_noise(c):
                    companies.add(c)
        raw_companies_per_event[event["id"]] = list(companies)
        all_raw_names.update(companies)

    print(f"Extracted {len(all_raw_names)} unique raw company names from {len(raw_companies_per_event)} events")

    normalized = {}
    for name in all_raw_names:
        normalized[name] = normalize(name)

    unique_normalized = list(set(normalized.values()))
    fuzzy_map = build_fuzzy_groups(unique_normalized)

    company_map = {}
    for raw, alias_norm in normalized.items():
        company_map[raw] = fuzzy_map.get(alias_norm, alias_norm)

    unique_final = set(company_map.values())
    print(f"Normalized to {len(unique_final)} unique companies")

    for event in events:
        raw = raw_companies_per_event.get(event["id"], [])
        event["companies_normalized"] = sorted(set(company_map.get(r, r) for r in raw))

    map_path = os.path.join(CACHE_DIR, "company_map.json")
    with open(map_path, "w") as f:
        json.dump(company_map, f, indent=2, sort_keys=True)
    print(f"Company map written to {map_path}")

    with open(events_path, "w") as f:
        json.dump(events, f, indent=2)
    print(f"Updated {events_path} with companies_normalized")


if __name__ == "__main__":
    main()
