# Phase 2: Python Pipeline Design

## Overview

7 Python scripts that extract text from 337 slide decks, normalize metadata, compute keywords/trends, and produce a view-oriented `enriched.json` for the KubeCon EU 2026 dashboard.

## Data Sources

- `kubecon-cloudnative-eu-2026/kubecon_eu_2026_slides/index.json` — 606 events, 223 slide files
- `cncf-hosted-co-located-events-eu-2026/colocated_eu_2026_slides/index.json` — 274 events, 114 slide files
- Slide files (PDF/PPTX) in subdirectories organized by event type

## Scripts

### 01_load_metadata.py

**Input**: Both `index.json` files.

**Process**: Load and flatten into a unified event list. Each event gets:
- `id` — deterministic hash of URL
- `source` — `"main"` or `"colocated"`
- `category` — the type key from index.json (strip emoji prefix)
- `title`, `description`, `date_time`, `venue`, `experience_level`
- `speakers` — array of `{name, title, bio}`
- `files` — array of `{url, filename, local_path}` with paths resolved to absolute
- `start_date`, `end_date`

**Output**: `cache/events_unified.json` — flat array of 880 events.

### 02_extract_slide_text.py

**Input**: Both `index.json` files (to resolve slide file paths). Does not depend on `01` output — reads index.json directly to find slide paths relative to each scraper's output directory.

**Process**:
- PDFs via PyMuPDF: extract text page-by-page, record page count
- PPTXs via python-pptx: extract text from all shapes across all slides
- Log files with < 100 chars extracted (likely image-only decks)
- Skip files that don't exist on disk

**Output**: `cache/slide_texts.json` — object keyed by `local_path`:
```json
{
  "Tutorials/some-deck.pdf": {
    "text": "full extracted text...",
    "page_count": 24,
    "char_count": 15000,
    "success": true
  }
}
```

### 03_normalize_companies.py

**Input**: `cache/events_unified.json`

**Process**:
1. **Primary extraction**: Parse talk title suffix. Titles follow `"Talk Title - Speaker Name, Company"` pattern. Extract company from last segment after the last `" - "` delimiter, then after the last comma.
2. **Fallback extraction**: Parse speaker `title` field (e.g., `"Senior SRE, STACKIT"` → `"STACKIT"`). Take the last comma-separated segment.
3. **Manual alias table**: Top ~50 known mappings (Google Cloud→Google, VMware by Broadcom→Broadcom, Red Hat→Red Hat, etc.)
4. **Fuzzy dedup**: Use thefuzz (token_sort_ratio, threshold 85) to merge remaining similar names.
5. **Multi-speaker handling**: A talk can have multiple speakers from different companies. Track all.

**Output**:
- `cache/company_map.json` — `{raw_name: normalized_name}` for all encountered company strings
- Updates `events_unified.json` in-place, adding `companies_normalized: string[]` to each event

### 04_extract_keywords.py

**Input**: `cache/events_unified.json`, `cache/slide_texts.json`

**Process**:
1. For each event, combine `description` + matched slide text (if any) into a single document
2. TF-IDF vectorization: `ngram_range=(1,3)`, `min_df=3`, `max_df=0.4`
3. Custom stop words: conference-specific terms ("kubecon", "kubernetes", "session", "talk", "speaker", "slides", etc.) + NLTK English stop words
4. Per-event: top 15 keywords by TF-IDF score
5. Per-category: aggregate TF-IDF across events in category, top 30 keywords

**Output**:
- `cache/event_keywords.json` — `{event_id: [{term, score}]}`
- `cache/category_keywords.json` — `{category: [{term, score}]}`

### 05_trend_analysis.py

**Input**: `cache/events_unified.json` (with companies), `cache/event_keywords.json`, `cache/category_keywords.json`

**Process**:
1. **Category depth matrix**: For each category — event count, avg description length, avg slide page count, % with slides, % with multiple speakers (collaboration signal)
2. **Technology mention frequency**: Scan combined text for a curated tech list (eBPF, Wasm, GitOps, service mesh, AI/ML terms, etc.). Compare main vs co-located frequencies.
3. **Cross-mapped category comparison**: Pair related categories between main and co-located:
   - Security ↔ Open Source SecurityCon
   - Observability ↔ Observability Day
   - Platform Engineering ↔ Platform Engineering Day
   - AI + ML ↔ Cloud Native AI + Kubeflow Day
   - (other natural pairs)
   Compare keyword overlap, unique keywords, depth metrics.
4. **Keyword co-occurrence**: Build co-occurrence matrix for top 100 keywords, identify clusters via simple community detection (connected components or label propagation).

**Output**: `cache/trend_findings.json`
```json
{
  "category_depth_matrix": [...],
  "tech_mentions": {"main": {...}, "colocated": {...}},
  "category_pairs": [...],
  "keyword_clusters": [...]
}
```

### 06_org_analysis.py

**Input**: `cache/events_unified.json` (with companies_normalized)

**Process**:
1. **Organization leaderboard**: Top 30 companies by speaker count, with breakdown by category
2. **End-user vs vendor classification**: Classify companies as end-user (banks, retailers, media) vs vendor (cloud providers, tooling companies). Use a manual classification table for top 50, mark rest as "other".
3. **Per-track end-user ratio**: Percentage of end-user speakers per category (high ratio = production maturity signal)
4. **Company-topic heatmap**: Matrix of top 20 companies × top 15 categories, cell = speaker count

**Output**: `cache/org_findings.json`
```json
{
  "org_leaderboard": [...],
  "company_classifications": {...},
  "track_enduser_ratio": {...},
  "company_topic_heatmap": {...}
}
```

### 07_generate_enriched.py

**Input**: All cache files.

**Process**: Combine into a view-oriented schema. One top-level key per dashboard view.

**Output**: `analysis/output/enriched.json`
```json
{
  "metadata": {
    "generated_at": "ISO timestamp",
    "event_count": 880,
    "slide_count": 337,
    "pipeline_version": "2.0"
  },
  "org_leaderboard": {
    "top_companies": [...],
    "company_classifications": {...}
  },
  "keyword_trends": {
    "by_category": {...},
    "tech_mentions": {...},
    "keyword_clusters": [...]
  },
  "ai_penetration": {
    "by_track": {...}
  },
  "category_depth_matrix": [...],
  "category_pairs": [...],
  "architecture_patterns": {
    "by_track": {...}
  },
  "emerging_established": {
    "technologies": [...]
  },
  "track_enduser_ratio": {...},
  "company_topic_heatmap": {...},
  "events": [...]
}
```

The `events` array includes per-event enrichments (keywords, companies_normalized, slide_char_count) so the dashboard can drill down.

## Execution Order

```
01 + 02  (parallel — no dependencies)
  → 03   (needs 01 output)
  → 04   (needs 01 + 02 outputs)
  → 05 + 06  (parallel — both need enriched events + keywords)
  → 07   (needs all cache files)
```

## Dependencies

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

## File Structure

```
analysis/
  requirements.txt
  specs/          — per-script specs (written before implementation)
  cache/          — intermediate outputs
  output/         — final enriched.json
  01_load_metadata.py
  02_extract_slide_text.py
  03_normalize_companies.py
  04_extract_keywords.py
  05_trend_analysis.py
  06_org_analysis.py
  07_generate_enriched.py
```
