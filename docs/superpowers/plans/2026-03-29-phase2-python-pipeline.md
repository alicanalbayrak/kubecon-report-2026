# Phase 2 Python Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 7-script Python pipeline that extracts slide text, normalizes companies, computes keywords/trends, and produces a view-oriented `enriched.json` for the KubeCon EU 2026 dashboard.

**Architecture:** Linear pipeline of independent scripts communicating via JSON files in `analysis/cache/`. Each script reads its inputs, writes its output, and can be re-run independently. Final script assembles everything into `analysis/output/enriched.json` with one top-level key per dashboard view.

**Tech Stack:** Python 3, PyMuPDF, python-pptx, pandas, scikit-learn, nltk, thefuzz, tqdm

---

## File Structure

```
analysis/
  requirements.txt          — Python dependencies
  01_load_metadata.py       — Flatten both index.json into unified event list
  02_extract_slide_text.py  — Extract text from PDF/PPTX files
  03_normalize_companies.py — Extract and normalize company names
  04_extract_keywords.py    — TF-IDF keyword extraction per event and category
  05_trend_analysis.py      — Category depth, tech mentions, cross-mapped pairs, keyword clusters
  06_org_analysis.py        — Org leaderboard, end-user vs vendor, company-topic heatmap
  07_generate_enriched.py   — Assemble all cache into view-oriented enriched.json
  cache/                    — Intermediate JSON outputs (gitignored)
  output/                   — Final enriched.json
```

---

### Task 1: Project setup — requirements.txt and directory structure

**Files:**
- Create: `analysis/requirements.txt`
- Modify: `.gitignore`

- [ ] **Step 1: Create requirements.txt**

```
pymupdf>=1.25.0
python-pptx>=1.0.0
pandas>=2.2.0
numpy>=2.0.0
scikit-learn>=1.6.0
nltk>=3.9.0
tqdm>=4.67.0
thefuzz>=0.22.0
```

- [ ] **Step 2: Create cache and output directories**

```bash
mkdir -p analysis/cache analysis/output
```

- [ ] **Step 3: Add cache to .gitignore**

Append to `.gitignore`:
```
analysis/cache/
analysis/.venv/
```

- [ ] **Step 4: Set up venv and install deps**

```bash
cd analysis
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m nltk.downloader punkt punkt_tab stopwords averaged_perceptron_tagger averaged_perceptron_tagger_eng
```

Expected: all packages install successfully, nltk data downloads.

- [ ] **Step 5: Commit**

```bash
git add analysis/requirements.txt .gitignore
git commit -m "Add Phase 2 analysis pipeline setup"
```

---

### Task 2: 01_load_metadata.py — Flatten index.json files into unified event list

**Files:**
- Create: `analysis/01_load_metadata.py`

**Context:** Two index.json files exist:
- `kubecon-cloudnative-eu-2026/kubecon_eu_2026_slides/index.json` (606 events)
- `cncf-hosted-co-located-events-eu-2026/colocated_eu_2026_slides/index.json` (274 events)

Each has structure: `{types: {TypeName: {event_count, events: [...]}}}`
Event fields: `url, title, description, date_time, venue, speakers, type, experience_level, files, start_date, end_date`
The `type` field has emoji prefixes on main KubeCon (e.g., `"📚 Tutorials"`) but not on co-located.
The `files[].local_path` is relative to the index.json's parent directory.

- [ ] **Step 1: Write 01_load_metadata.py**

```python
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
```

- [ ] **Step 2: Run and verify**

```bash
cd analysis && source .venv/bin/activate
python 01_load_metadata.py
```

Expected output:
```
Loaded 606 events from main
Loaded 274 events from colocated
Total: 880 events
Written to .../analysis/cache/events_unified.json
```

Verify:
```bash
python -c "import json; d=json.load(open('cache/events_unified.json')); print(len(d)); print(d[0].keys())"
```

Expected: 880 events, keys include `id, url, source, category, title, description, speakers, files`.

- [ ] **Step 3: Commit**

```bash
git add analysis/01_load_metadata.py
git commit -m "Add 01_load_metadata: flatten index.json into unified events"
```

---

### Task 3: 02_extract_slide_text.py — Extract text from PDF/PPTX files

**Files:**
- Create: `analysis/02_extract_slide_text.py`

**Context:** 314 PDFs and 23 PPTXs across two scraper directories. This script reads both `index.json` files directly (does NOT depend on `01`'s output) to find file paths. Uses PyMuPDF for PDFs, python-pptx for PPTXs.

- [ ] **Step 1: Write 02_extract_slide_text.py**

```python
"""Extract text from PDF and PPTX slide files."""

import json
import os

import fitz  # PyMuPDF
from pptx import Presentation
from tqdm import tqdm

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOURCES = [
    {
        "path": os.path.join(REPO_ROOT, "kubecon-cloudnative-eu-2026", "kubecon_eu_2026_slides", "index.json"),
        "slides_dir": os.path.join(REPO_ROOT, "kubecon-cloudnative-eu-2026", "kubecon_eu_2026_slides"),
    },
    {
        "path": os.path.join(REPO_ROOT, "cncf-hosted-co-located-events-eu-2026", "colocated_eu_2026_slides", "index.json"),
        "slides_dir": os.path.join(REPO_ROOT, "cncf-hosted-co-located-events-eu-2026", "colocated_eu_2026_slides"),
    },
]

LOW_TEXT_THRESHOLD = 100


def collect_slide_paths() -> list[tuple[str, str]]:
    """Return list of (absolute_path, local_path) for all slide files."""
    paths = []
    seen = set()
    for source in SOURCES:
        with open(source["path"]) as f:
            data = json.load(f)
        for type_data in data["types"].values():
            for event in type_data["events"]:
                for file_info in event.get("files", []):
                    abs_path = os.path.join(source["slides_dir"], file_info["local_path"])
                    if abs_path not in seen and os.path.exists(abs_path):
                        seen.add(abs_path)
                        paths.append((abs_path, file_info["local_path"]))
    return paths


def extract_pdf(path: str) -> dict:
    try:
        doc = fitz.open(path)
        pages = []
        for page in doc:
            pages.append(page.get_text())
        text = "\n\n".join(pages)
        result = {
            "text": text,
            "page_count": len(doc),
            "char_count": len(text),
            "success": True,
        }
        doc.close()
        return result
    except Exception as e:
        return {"text": "", "page_count": 0, "char_count": 0, "success": False, "error": str(e)}


def extract_pptx(path: str) -> dict:
    try:
        prs = Presentation(path)
        texts = []
        slide_count = 0
        for slide in prs.slides:
            slide_count += 1
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()
                        if text:
                            texts.append(text)
        text = "\n".join(texts)
        return {
            "text": text,
            "page_count": slide_count,
            "char_count": len(text),
            "success": True,
        }
    except Exception as e:
        return {"text": "", "page_count": 0, "char_count": 0, "success": False, "error": str(e)}


def main():
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
    os.makedirs(cache_dir, exist_ok=True)

    paths = collect_slide_paths()
    print(f"Found {len(paths)} unique slide files")

    results = {}
    low_text = []

    for abs_path, local_path in tqdm(paths, desc="Extracting text"):
        ext = os.path.splitext(abs_path)[1].lower()
        if ext == ".pdf":
            result = extract_pdf(abs_path)
        elif ext == ".pptx":
            result = extract_pptx(abs_path)
        else:
            continue

        results[local_path] = result
        if result["success"] and result["char_count"] < LOW_TEXT_THRESHOLD:
            low_text.append(local_path)

    success = sum(1 for r in results.values() if r["success"])
    failed = sum(1 for r in results.values() if not r["success"])
    print(f"Extracted: {success} success, {failed} failed")
    if low_text:
        print(f"Low text ({len(low_text)} files, <{LOW_TEXT_THRESHOLD} chars):")
        for p in low_text[:10]:
            print(f"  {p}")
        if len(low_text) > 10:
            print(f"  ... and {len(low_text) - 10} more")

    out_path = os.path.join(cache_dir, "slide_texts.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

```bash
python 02_extract_slide_text.py
```

Expected: progress bar across ~337 files, 2-5 minutes. Output should show success count near 337, low-text file list.

Verify:
```bash
python -c "import json; d=json.load(open('cache/slide_texts.json')); print(f'{len(d)} files'); s=[v for v in d.values() if v[\"success\"]]; print(f'{len(s)} successful')"
```

- [ ] **Step 3: Commit**

```bash
git add analysis/02_extract_slide_text.py
git commit -m "Add 02_extract_slide_text: PDF/PPTX text extraction"
```

---

### Task 4: 03_normalize_companies.py — Extract and normalize company names

**Files:**
- Create: `analysis/03_normalize_companies.py`

**Context:** Talk titles follow `"Talk Title - Speaker Name, Company"` pattern (709 of 880 have `" - "`). Speaker `title` field has `"Role, Company"` as fallback. Multi-speaker talks can have multiple companies. Events without `" - "` are breaks, BoFs, community events — safe to skip for company extraction.

- [ ] **Step 1: Write 03_normalize_companies.py**

```python
"""Extract and normalize company names from event metadata."""

import json
import os
import re

from thefuzz import fuzz

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

# Manual alias table — maps raw company strings to canonical names.
# Built from inspecting the top companies in the dataset.
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
    "HashiCorp": "HashiCorp",
    "Kong Inc.": "Kong",
    "Kong Inc": "Kong",
    "Grafana Labs": "Grafana Labs",
    "D2iQ": "D2iQ",
    "Solo.io": "Solo.io",
    "Isovalent": "Isovalent",
    "Isovalent (now part of Cisco)": "Cisco",
    "Weaveworks": "Weaveworks",
    "Buoyant": "Buoyant",
    "Buoyant, Inc.": "Buoyant",
    "Spectro Cloud": "Spectro Cloud",
    "LY Corporation": "LY Corporation",
    "DaoCloud": "DaoCloud",
    "Tetrate": "Tetrate",
    "Tetrate.io": "Tetrate",
}

FUZZY_THRESHOLD = 85

# Patterns to skip — these indicate non-company entries
SKIP_PATTERNS = [
    re.compile(r"(?i)^(coffee|lunch|break|keynote|registration|party|social|reception)", re.IGNORECASE),
    re.compile(r"(?i)(SEPARATE REGISTRATION|ALL ACCESS|FULL.DAY)", re.IGNORECASE),
]


def extract_company_from_title(title: str) -> list[str]:
    """Extract company names from talk title suffix: 'Talk - Name, Company; Name2, Company2'."""
    if " - " not in title:
        return []

    suffix = title.rsplit(" - ", 1)[1]

    # Handle multiple speakers separated by ; or &
    # Pattern: "Speaker Name, Company & Speaker Name, Company"
    # or "Speaker Name, Company; Speaker Name, Company"
    companies = []
    # Split by ; or & but be careful — & can appear in company names
    # Strategy: split by "; " first, then handle " & " within segments
    segments = re.split(r";\s*", suffix)

    for segment in segments:
        # Within a segment, speakers may be separated by " & "
        # But "Company & Company" is also valid. Heuristic: if there's a comma after &, it's multi-speaker.
        # "Alice, Google & Bob, Microsoft" → two speakers
        # "Alice & Bob, Google" → one company
        parts = re.split(r"\s+&\s+", segment)
        if len(parts) > 1 and all("," in p for p in parts):
            # Each part has a comma → each is "Name, Company"
            for part in parts:
                company = part.rsplit(",", 1)[-1].strip()
                if company:
                    companies.append(company)
        else:
            # Treat the whole segment as one entry, take last comma segment
            full = segment.strip()
            if "," in full:
                company = full.rsplit(",", 1)[-1].strip()
                if company:
                    companies.append(company)

    return companies


def extract_company_from_speaker_title(speaker_title: str) -> str:
    """Extract company from speaker title field: 'Role, Company'."""
    if not speaker_title or "," not in speaker_title:
        return ""
    # Take the last comma-separated segment
    # Handle "Role | Other, Company" — pipe is sometimes used
    company = speaker_title.rsplit(",", 1)[-1].strip()
    return company


def normalize(name: str) -> str:
    """Apply alias table to a raw company name."""
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
    """Group similar company names using fuzzy matching. Returns raw→canonical map."""
    canonical = {}
    groups = []  # list of (canonical_name, [members])

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

    # Phase 1: Extract raw company names
    raw_companies_per_event = {}
    all_raw_names = set()

    for event in events:
        if should_skip_event(event):
            continue

        companies = set()

        # Primary: from talk title
        title_companies = extract_company_from_title(event["title"])
        for c in title_companies:
            companies.add(c)

        # Fallback: from speaker title (only if title extraction yielded nothing)
        if not companies:
            for speaker in event.get("speakers", []):
                c = extract_company_from_speaker_title(speaker.get("title", ""))
                if c:
                    companies.add(c)

        raw_companies_per_event[event["id"]] = list(companies)
        all_raw_names.update(companies)

    print(f"Extracted {len(all_raw_names)} unique raw company names from {len(raw_companies_per_event)} events")

    # Phase 2: Normalize via alias table
    normalized = {}
    for name in all_raw_names:
        normalized[name] = normalize(name)

    # Phase 3: Fuzzy dedup on the normalized names
    unique_normalized = list(set(normalized.values()))
    fuzzy_map = build_fuzzy_groups(unique_normalized)

    # Combine: raw → alias-normalized → fuzzy-canonical
    company_map = {}
    for raw, alias_norm in normalized.items():
        company_map[raw] = fuzzy_map.get(alias_norm, alias_norm)

    unique_final = set(company_map.values())
    print(f"Normalized to {len(unique_final)} unique companies")

    # Phase 4: Update events with normalized companies
    for event in events:
        raw = raw_companies_per_event.get(event["id"], [])
        event["companies_normalized"] = sorted(set(company_map.get(r, r) for r in raw))

    # Save outputs
    map_path = os.path.join(CACHE_DIR, "company_map.json")
    with open(map_path, "w") as f:
        json.dump(company_map, f, indent=2, sort_keys=True)
    print(f"Company map written to {map_path}")

    with open(events_path, "w") as f:
        json.dump(events, f, indent=2)
    print(f"Updated {events_path} with companies_normalized")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

```bash
python 03_normalize_companies.py
```

Expected: extracts ~300+ unique raw names, normalizes to fewer. Check the output:

```bash
python -c "
import json
m = json.load(open('cache/company_map.json'))
print(f'{len(m)} mappings')
# Show top companies
from collections import Counter
events = json.load(open('cache/events_unified.json'))
c = Counter()
for e in events:
    for co in e.get('companies_normalized', []):
        c[co] += 1
for name, count in c.most_common(20):
    print(f'  {count:3d} {name}')
"
```

Expected: Red Hat, Google, Microsoft, NVIDIA near the top.

- [ ] **Step 3: Commit**

```bash
git add analysis/03_normalize_companies.py
git commit -m "Add 03_normalize_companies: extract and normalize company names"
```

---

### Task 5: 04_extract_keywords.py — TF-IDF keyword extraction

**Files:**
- Create: `analysis/04_extract_keywords.py`

**Context:** Depends on `cache/events_unified.json` (with companies from `03`) and `cache/slide_texts.json` (from `02`). Combines event description + slide text into one document per event, then runs TF-IDF.

- [ ] **Step 1: Write 04_extract_keywords.py**

```python
"""TF-IDF keyword extraction per event and per category."""

import json
import os
from collections import defaultdict

from sklearn.feature_extraction.text import TfidfVectorizer

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

CONFERENCE_STOP_WORDS = [
    "kubecon", "cloudnativecon", "kubernetes", "cloud", "native", "cncf",
    "session", "talk", "speaker", "slides", "presentation", "conference",
    "attendees", "attendee", "europe", "amsterdam", "2026", "kccnc",
    "tutorial", "lightning", "keynote", "poster",
    "learn", "will", "using", "use", "used", "new", "also", "one",
    "way", "well", "make", "like", "need", "come", "want", "look",
    "let", "know", "take", "get", "can", "just",
]

TOP_N_PER_EVENT = 15
TOP_N_PER_CATEGORY = 30


def build_documents(events: list, slide_texts: dict) -> list[dict]:
    """Build one text document per event by combining description + slide text."""
    docs = []
    for event in events:
        parts = []
        desc = event.get("description", "")
        if desc:
            parts.append(desc)

        for file_info in event.get("files", []):
            local_path = file_info.get("local_path", "")
            slide = slide_texts.get(local_path, {})
            if slide.get("success") and slide.get("text"):
                parts.append(slide["text"])

        text = "\n\n".join(parts)
        if text.strip():
            docs.append({"id": event["id"], "category": event["category"], "text": text})

    return docs


def extract_keywords(docs: list[dict]) -> tuple[dict, dict]:
    """Run TF-IDF and extract top keywords per event and per category."""
    if not docs:
        return {}, {}

    texts = [d["text"] for d in docs]

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 3),
        min_df=3,
        max_df=0.4,
        stop_words=CONFERENCE_STOP_WORDS,
        max_features=10000,
        token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z0-9\-\.]{1,}\b",
    )

    tfidf_matrix = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names_out()

    # Per-event keywords
    event_keywords = {}
    for i, doc in enumerate(docs):
        row = tfidf_matrix[i].toarray().flatten()
        top_indices = row.argsort()[-TOP_N_PER_EVENT:][::-1]
        keywords = []
        for idx in top_indices:
            score = float(row[idx])
            if score > 0:
                keywords.append({"term": feature_names[idx], "score": round(score, 4)})
        event_keywords[doc["id"]] = keywords

    # Per-category keywords: average TF-IDF across events in each category
    category_docs = defaultdict(list)
    for i, doc in enumerate(docs):
        category_docs[doc["category"]].append(i)

    category_keywords = {}
    for category, indices in category_docs.items():
        avg_scores = tfidf_matrix[indices].toarray().mean(axis=0)
        top_indices = avg_scores.argsort()[-TOP_N_PER_CATEGORY:][::-1]
        keywords = []
        for idx in top_indices:
            score = float(avg_scores[idx])
            if score > 0:
                keywords.append({"term": feature_names[idx], "score": round(score, 4)})
        category_keywords[category] = keywords

    return event_keywords, category_keywords


def main():
    with open(os.path.join(CACHE_DIR, "events_unified.json")) as f:
        events = json.load(f)
    with open(os.path.join(CACHE_DIR, "slide_texts.json")) as f:
        slide_texts = json.load(f)

    docs = build_documents(events, slide_texts)
    print(f"Built {len(docs)} documents ({len(events) - len(docs)} events had no text)")

    event_keywords, category_keywords = extract_keywords(docs)
    print(f"Extracted keywords for {len(event_keywords)} events, {len(category_keywords)} categories")

    # Show top 10 keywords per category (preview)
    for cat in sorted(category_keywords.keys()):
        top3 = ", ".join(kw["term"] for kw in category_keywords[cat][:3])
        print(f"  {cat}: {top3}")

    with open(os.path.join(CACHE_DIR, "event_keywords.json"), "w") as f:
        json.dump(event_keywords, f, indent=2)
    with open(os.path.join(CACHE_DIR, "category_keywords.json"), "w") as f:
        json.dump(category_keywords, f, indent=2)
    print("Written to cache/event_keywords.json and cache/category_keywords.json")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

```bash
python 04_extract_keywords.py
```

Expected: builds ~700+ documents (events with text), extracts keywords per event and category. Category keyword preview should show domain-relevant terms (e.g., Security: "supply chain", "vulnerability"; AI + ML: "model", "inference").

Verify:
```bash
python -c "
import json
ek = json.load(open('cache/event_keywords.json'))
ck = json.load(open('cache/category_keywords.json'))
print(f'{len(ek)} event keywords, {len(ck)} category keywords')
print('Security top 5:', [kw['term'] for kw in ck.get('Security', [])[:5]])
"
```

- [ ] **Step 3: Commit**

```bash
git add analysis/04_extract_keywords.py
git commit -m "Add 04_extract_keywords: TF-IDF keyword extraction"
```

---

### Task 6: 05_trend_analysis.py — Category depth, tech mentions, cross-mapped pairs, keyword clusters

**Files:**
- Create: `analysis/05_trend_analysis.py`

**Context:** Reads `events_unified.json`, `event_keywords.json`, `category_keywords.json`, `slide_texts.json`. Produces trend findings including category depth matrix, technology mention frequency with main vs co-located comparison, cross-mapped category pairs, and keyword co-occurrence clusters.

Cross-mapped pairs:
- Security ↔ Open Source SecurityCon
- Observability ↔ Observability Day
- Platform Engineering ↔ Platform Engineering Day
- AI + ML ↔ Cloud Native AI + Kubeflow Day
- Connectivity ↔ CiliumCon
- Application Development ↔ BackstageCon
- Operations + Performance ↔ FluxCon
- Data Processing + Storage ↔ WasmCon

- [ ] **Step 1: Write 05_trend_analysis.py**

```python
"""Trend analysis: category depth, tech mentions, cross-mapped pairs, keyword clusters."""

import json
import os
import re
from collections import Counter, defaultdict

import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

# Cross-mapped category pairs (main ↔ co-located)
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

# Curated technology list for mention frequency
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


def category_depth_matrix(events: list, slide_texts: dict) -> list[dict]:
    """Compute depth metrics per category."""
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


def tech_mention_frequency(events: list, slide_texts: dict) -> dict:
    """Count technology mentions in main vs co-located."""
    def get_full_text(event):
        parts = [event.get("description", ""), event.get("title", "")]
        for fi in event.get("files", []):
            slide = slide_texts.get(fi.get("local_path", ""), {})
            if slide.get("text"):
                parts.append(slide["text"])
        return " ".join(parts).lower()

    results = {"main": {}, "colocated": {}}
    for source in ["main", "colocated"]:
        source_events = [e for e in events if e["source"] == source]
        total = len(source_events)
        for tech_name, pattern in TECH_TERMS.items():
            regex = re.compile(pattern, re.IGNORECASE)
            count = sum(1 for e in source_events if regex.search(get_full_text(e)))
            results[source][tech_name] = {
                "count": count,
                "pct": round(count / total * 100, 1) if total else 0,
            }
    return results


def cross_mapped_pairs(events: list, category_keywords: dict) -> list[dict]:
    """Compare keyword overlap between paired main/co-located categories."""
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


def keyword_cooccurrence_clusters(event_keywords: dict, top_n: int = 100) -> list[dict]:
    """Build co-occurrence matrix for top keywords and find clusters."""
    # Collect all keywords and their frequencies
    keyword_freq = Counter()
    for keywords in event_keywords.values():
        for kw in keywords:
            keyword_freq[kw["term"]] += 1

    top_keywords = [term for term, _ in keyword_freq.most_common(top_n)]
    kw_to_idx = {kw: i for i, kw in enumerate(top_keywords)}
    n = len(top_keywords)

    # Build co-occurrence matrix
    cooccurrence = np.zeros((n, n), dtype=int)
    for keywords in event_keywords.values():
        event_terms = [kw["term"] for kw in keywords if kw["term"] in kw_to_idx]
        for i, t1 in enumerate(event_terms):
            for t2 in event_terms[i + 1:]:
                idx1, idx2 = kw_to_idx[t1], kw_to_idx[t2]
                cooccurrence[idx1][idx2] += 1
                cooccurrence[idx2][idx1] += 1

    # Simple community detection: connected components with threshold
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
                clusters.append({
                    "terms": cluster_terms,
                    "size": len(cluster_terms),
                })

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
    print(f"  Top main: {', '.join(f'{t[0]}({t[1][\"count\"]})' for t in main_top)}")

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
```

- [ ] **Step 2: Run and verify**

```bash
python 05_trend_analysis.py
```

Expected: category depth for all ~44 categories, tech mentions with counts, ~8 category pairs, keyword clusters.

Verify:
```bash
python -c "
import json
d = json.load(open('cache/trend_findings.json'))
print(f'Depth matrix: {len(d[\"category_depth_matrix\"])} categories')
print(f'Category pairs: {len(d[\"category_pairs\"])}')
print(f'Keyword clusters: {len(d[\"keyword_clusters\"])}')
top_tech = sorted(d['tech_mentions']['main'].items(), key=lambda x: x[1]['count'], reverse=True)[:5]
for name, data in top_tech:
    print(f'  {name}: {data[\"count\"]} ({data[\"pct\"]}%)')
"
```

- [ ] **Step 3: Commit**

```bash
git add analysis/05_trend_analysis.py
git commit -m "Add 05_trend_analysis: category depth, tech mentions, keyword clusters"
```

---

### Task 7: 06_org_analysis.py — Organization leaderboard, end-user vs vendor, heatmap

**Files:**
- Create: `analysis/06_org_analysis.py`

**Context:** Reads `events_unified.json` (with `companies_normalized` added by `03`). Produces org leaderboard, end-user/vendor classification, per-track ratios, and company-topic heatmap.

- [ ] **Step 1: Write 06_org_analysis.py**

```python
"""Organization analysis: leaderboard, end-user vs vendor, company-topic heatmap."""

import json
import os
from collections import Counter, defaultdict

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

TOP_COMPANIES = 30
HEATMAP_COMPANIES = 20
HEATMAP_CATEGORIES = 15

# Classification: end-user companies (consumers/operators of cloud native tech)
# vs vendors (providers/builders of cloud native tech)
# Top 50 by expected speaker count — extend as needed after seeing actual data
COMPANY_CLASSIFICATION = {
    # Vendors
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
    # End-users
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


def classify_company(name: str) -> str:
    return COMPANY_CLASSIFICATION.get(name, "other")


def main():
    with open(os.path.join(CACHE_DIR, "events_unified.json")) as f:
        events = json.load(f)

    # Organization leaderboard
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

    # End-user vs vendor ratio per track
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

    # Company-topic heatmap
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

    # Build full classification map for all encountered companies
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
```

- [ ] **Step 2: Run and verify**

```bash
python 06_org_analysis.py
```

Expected: top 30 companies with counts, classification breakdown. Red Hat, Google should be near the top.

Verify:
```bash
python -c "
import json
d = json.load(open('cache/org_findings.json'))
print(f'Leaderboard: {len(d[\"org_leaderboard\"])} companies')
print(f'Classifications: {len(d[\"company_classifications\"])} companies')
print(f'Track ratios: {len(d[\"track_enduser_ratio\"])} tracks')
print(f'Heatmap cells: {len(d[\"company_topic_heatmap\"][\"cells\"])}')
"
```

- [ ] **Step 3: Commit**

```bash
git add analysis/06_org_analysis.py
git commit -m "Add 06_org_analysis: org leaderboard, end-user vs vendor, heatmap"
```

---

### Task 8: 07_generate_enriched.py — Assemble view-oriented enriched.json

**Files:**
- Create: `analysis/07_generate_enriched.py`

**Context:** Reads all cache files and assembles the final `enriched.json` with one top-level key per dashboard view. Also includes a slimmed-down `events` array with per-event enrichments for drill-down.

- [ ] **Step 1: Write 07_generate_enriched.py**

```python
"""Assemble all cache outputs into view-oriented enriched.json."""

import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

# AI-related terms for penetration heatmap
AI_TERMS = re.compile(
    r"\b(?:ai|artificial\s*intelligence|machine\s*learning|ml|llm|"
    r"large\s*language\s*model|deep\s*learning|neural|gpt|"
    r"rag|retrieval\s*augmented|inference|training|gpu|"
    r"vllm|kuberay|kubeflow|agentic|ai\s*agent|mcp)\b",
    re.IGNORECASE,
)

# Architecture pattern terms
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


def compute_ai_penetration(events: list, slide_texts: dict) -> dict:
    """Compute % of AI-related content per non-AI track."""
    by_track = defaultdict(lambda: {"total": 0, "ai_count": 0})

    for event in events:
        cat = event["category"]
        by_track[cat]["total"] += 1

        # Build full text for this event
        parts = [event.get("title", ""), event.get("description", "")]
        for fi in event.get("files", []):
            slide = slide_texts.get(fi.get("local_path", ""), {})
            if slide.get("text"):
                parts.append(slide["text"])
        full_text = " ".join(parts)

        if AI_TERMS.search(full_text):
            by_track[cat]["ai_count"] += 1

    result = {}
    for cat, counts in sorted(by_track.items()):
        if counts["total"] > 0:
            result[cat] = {
                "total_events": counts["total"],
                "ai_events": counts["ai_count"],
                "ai_pct": round(counts["ai_count"] / counts["total"] * 100, 1),
            }

    return result


def compute_architecture_patterns(events: list, slide_texts: dict) -> dict:
    """Count architecture pattern mentions per track."""
    by_track = defaultdict(lambda: Counter())

    for event in events:
        parts = [event.get("title", ""), event.get("description", "")]
        for fi in event.get("files", []):
            slide = slide_texts.get(fi.get("local_path", ""), {})
            if slide.get("text"):
                parts.append(slide["text"])
        full_text = " ".join(parts)

        for pattern_name, regex in ARCH_PATTERNS.items():
            if regex.search(full_text):
                by_track[event["category"]][pattern_name] += 1

    result = {}
    for cat in sorted(by_track.keys()):
        result[cat] = dict(by_track[cat].most_common())

    return result


def build_enriched_events(events: list, event_keywords: dict, slide_texts: dict) -> list:
    """Build slimmed-down event list with enrichments for dashboard drill-down."""
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

    print("Computing AI penetration heatmap...")
    ai_penetration = compute_ai_penetration(events, slide_texts)

    print("Computing architecture patterns...")
    arch_patterns = compute_architecture_patterns(events, slide_texts)

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
```

- [ ] **Step 2: Run and verify**

```bash
python 07_generate_enriched.py
```

Expected: enriched.json written to `analysis/output/enriched.json`, size ~2-5 MB.

Verify:
```bash
python -c "
import json
d = json.load(open('output/enriched.json'))
for key in d:
    if isinstance(d[key], dict):
        print(f'{key}: {list(d[key].keys())[:5]}')
    elif isinstance(d[key], list):
        print(f'{key}: {len(d[key])} items')
    else:
        print(f'{key}: {d[key]}')
"
```

Expected: all top-level keys present — metadata, org_leaderboard, keyword_trends, ai_penetration, category_depth_matrix, category_pairs, architecture_patterns, track_enduser_ratio, company_topic_heatmap, events.

- [ ] **Step 3: Commit**

```bash
git add analysis/07_generate_enriched.py
git commit -m "Add 07_generate_enriched: assemble view-oriented enriched.json"
```

---

### Task 9: End-to-end pipeline run and validation

**Files:**
- No new files — validation only

- [ ] **Step 1: Clean cache and run full pipeline**

```bash
rm -rf cache/*
python 01_load_metadata.py
python 02_extract_slide_text.py
python 03_normalize_companies.py
python 04_extract_keywords.py
python 05_trend_analysis.py
python 06_org_analysis.py
python 07_generate_enriched.py
```

- [ ] **Step 2: Validate enriched.json completeness**

```bash
python -c "
import json
d = json.load(open('output/enriched.json'))
assert d['metadata']['event_count'] == 880
assert d['metadata']['slide_count'] > 300
assert len(d['org_leaderboard']['top_companies']) == 30
assert len(d['category_depth_matrix']) > 30
assert len(d['events']) == 880
assert all('keywords' in e for e in d['events'])
assert all('companies_normalized' in e for e in d['events'])
print('All validations passed')
"
```

Expected: "All validations passed"

- [ ] **Step 3: Copy to dashboard**

```bash
cp analysis/output/enriched.json dashboard/public/data/
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/public/data/enriched.json
git commit -m "Add enriched.json from Phase 2 pipeline"
```
