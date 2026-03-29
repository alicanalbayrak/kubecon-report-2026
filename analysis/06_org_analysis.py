"""Organization analysis: leaderboard, end-user vs vendor, company-topic heatmap."""

import json
import os
from collections import Counter, defaultdict

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

TOP_COMPANIES = 30
HEATMAP_COMPANIES = 20
HEATMAP_CATEGORIES = 15

COMPANY_CLASSIFICATION = {
    "Google": "vendor",
    "Red Hat": "vendor",
    "Microsoft": "vendor",
    "AWS": "vendor",
    "NVIDIA": "vendor",
    "Broadcom": "vendor",
    "IBM": "vendor",
    "Cisco": "vendor",
    "Intel": "vendor",
    "SUSE": "vendor",
    "Huawei": "vendor",
    "Oracle": "vendor",
    "SAP": "vendor",
    "Apple": "vendor",
    "Datadog": "vendor",
    "Grafana Labs": "vendor",
    "HashiCorp": "vendor",
    "Kong": "vendor",
    "Solo.io": "vendor",
    "Isovalent": "vendor",
    "Buoyant": "vendor",
    "Tetrate": "vendor",
    "D2iQ": "vendor",
    "Spectro Cloud": "vendor",
    "Weaveworks": "vendor",
    "Chainguard": "vendor",
    "Aqua Security": "vendor",
    "Snyk": "vendor",
    "Palo Alto Networks": "vendor",
    "Elastic": "vendor",
    "Cloudflare": "vendor",
    "DigitalOcean": "vendor",
    "Akamai": "vendor",
    "Canonical": "vendor",
    "DaoCloud": "vendor",
    "Kasten": "vendor",
    "Upbound": "vendor",
    "Pulumi": "vendor",
    "Nebius": "vendor",
    "Uber": "end-user",
    "Spotify": "end-user",
    "Shopify": "end-user",
    "Intuit": "end-user",
    "Bloomberg": "end-user",
    "JP Morgan": "end-user",
    "Goldman Sachs": "end-user",
    "Deutsche Telekom": "end-user",
    "Mercedes-Benz": "end-user",
    "BMW": "end-user",
    "Adidas": "end-user",
    "Zalando": "end-user",
    "ING": "end-user",
    "ABN AMRO": "end-user",
    "Booking.com": "end-user",
    "LY Corporation": "end-user",
    "Feedzai": "end-user",
    "STACKIT": "end-user",
    "Vodafone": "end-user",
    "T-Mobile": "end-user",
    "Airbus": "end-user",
    "Siemens": "end-user",
    "Bosch": "end-user",
}


def classify_company(name):
    return COMPANY_CLASSIFICATION.get(name, "other")


def main():
    with open(os.path.join(CACHE_DIR, "events_unified.json")) as f:
        events = json.load(f)

    company_speakers = Counter()
    company_by_category = defaultdict(lambda: Counter())
    for event in events:
        for company in event.get("companies_normalized", []):
            company_speakers[company] += 1
            company_by_category[company][event["category"]] += 1

    top_companies = []
    for company, count in company_speakers.most_common(TOP_COMPANIES):
        category_breakdown = dict(company_by_category[company].most_common(10))
        top_companies.append({
            "company": company,
            "speaker_count": count,
            "classification": classify_company(company),
            "categories": category_breakdown,
        })

    print(f"Top {TOP_COMPANIES} companies by speaker count:")
    for entry in top_companies[:10]:
        print(f"  {entry['speaker_count']:3d} {entry['company']} ({entry['classification']})")

    track_counts = defaultdict(lambda: {"end-user": 0, "vendor": 0, "other": 0})
    for event in events:
        for company in event.get("companies_normalized", []):
            cls = classify_company(company)
            track_counts[event["category"]][cls] += 1

    track_enduser_ratio = {}
    for category, counts in sorted(track_counts.items()):
        total = counts["end-user"] + counts["vendor"] + counts["other"]
        if total > 0:
            track_enduser_ratio[category] = {
                "end_user_count": counts["end-user"],
                "vendor_count": counts["vendor"],
                "other_count": counts["other"],
                "end_user_pct": round(counts["end-user"] / total * 100, 1),
                "vendor_pct": round(counts["vendor"] / total * 100, 1),
                "total": total,
            }

    top_heatmap_companies = [c for c, _ in company_speakers.most_common(HEATMAP_COMPANIES)]
    all_categories = Counter()
    for event in events:
        all_categories[event["category"]] += 1
    top_heatmap_categories = [c for c, _ in all_categories.most_common(HEATMAP_CATEGORIES)]

    heatmap = {
        "companies": top_heatmap_companies,
        "categories": top_heatmap_categories,
        "cells": [],
    }
    for company in top_heatmap_companies:
        for category in top_heatmap_categories:
            count = company_by_category[company].get(category, 0)
            if count > 0:
                heatmap["cells"].append({
                    "company": company,
                    "category": category,
                    "count": count,
                })

    company_classifications = {}
    for company in company_speakers:
        company_classifications[company] = classify_company(company)

    findings = {
        "org_leaderboard": top_companies,
        "company_classifications": company_classifications,
        "track_enduser_ratio": track_enduser_ratio,
        "company_topic_heatmap": heatmap,
    }

    out_path = os.path.join(CACHE_DIR, "org_findings.json")
    with open(out_path, "w") as f:
        json.dump(findings, f, indent=2)
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
