# Phase 2: Deeper Analysis — Slide Content + Semantic Trends

## Status: Not Started
**Prerequisite**: Phase 1 dashboard is live at GitHub Pages (completed).

---

## Goal

Enrich the dashboard with insights that can't be derived from metadata alone — by extracting text from 337 PDF/PPTX slide decks and running Claude Code subagent semantic analysis across all categories.

The output is an `enriched.json` that the dashboard loads alongside the raw data, unlocking new views.

---

## Architecture

```
Layer 1: PYTHON PIPELINE (data extraction + quantitative analysis)
  Extract slide text → Merge metadata → Normalize companies → TF-IDF keywords

Layer 2: CLAUDE CODE SUBAGENTS (semantic intelligence)
  Read extracted data → Theme analysis per category → Cross-cutting synthesis
```

- Python does what Python is good at: PDF parsing, TF-IDF math, company normalization
- Claude Code subagents do what Claude is good at: understanding meaning, finding patterns
- No API key needed — subagents run on the MAX plan

---

## Python Pipeline (7 scripts)

### Dependencies (`requirements.txt`)

```
pymupdf>=1.25.0         # PDF text extraction
python-pptx>=1.0.0      # PPTX text extraction
pandas>=2.2.0
numpy>=2.0.0
scikit-learn>=1.6.0     # TF-IDF, clustering
nltk>=3.9.0             # tokenization, noun phrases, stopwords
tqdm>=4.67.0            # progress bars
thefuzz>=0.22.0         # fuzzy string matching for company normalization
```

### Scripts

#### `01_load_metadata.py`
- Load both `index.json` files
- Flatten into unified event list with `source`, `category`, `company_raw`
- **Output**: `cache/events_unified.json` (880 events)

#### `02_extract_slide_text.py`
- PDFs via PyMuPDF: text page-by-page, page count
- PPTXs via python-pptx: text from all shapes/slides
- Log files with < 100 chars (likely image-only)
- **Output**: `cache/slide_texts.json` — `{local_path: {text, page_count, char_count, success}}`
- **Performance**: 337 files, expect 2-5 minutes

#### `03_normalize_companies.py`
- Manual alias table for top 50 companies (Google Cloud→Google, VMware by Broadcom→Broadcom, etc.)
- Handle multi-comma titles ("VP of Engineering, Cloud Division, Google")
- Fuzzy matching via thefuzz for remaining (threshold ~85)
- **Output**: `cache/company_map.json`, updated events with `companies_normalized`

#### `04_extract_keywords.py`
- Combine description + slide text per event
- TF-IDF: `ngram_range=(1,3)`, `min_df=3`, `max_df=0.4`, custom stop words
- **Output**: `cache/event_keywords.json`, `cache/category_keywords.json`

#### `05_trend_analysis.py`
- Category size vs. depth matrix
- Technology mention frequency (main vs co-located comparison)
- Keyword co-occurrence network (top 100 keywords, community detection)
- **Output**: `cache/trend_findings.json`

#### `06_org_analysis.py`
- Organization leaderboard (top 30 by speaker count, per track)
- End-user vs. vendor classification per track
- Company-topic heatmap data
- **Output**: `cache/org_findings.json`

#### `07_generate_enriched.py`
- Combines all analysis outputs into a single `enriched.json`
- Schema designed for the dashboard to consume
- **Output**: `analysis/output/enriched.json` → copy to `dashboard/public/data/`

### Execution Order

```
01 + 02 (parallel, no deps)
  → 03 (needs 01)
  → 04 (needs 01 + 02)
  → 05 + 06 (parallel, need enriched data)
  → 07 (needs all)
```

---

## Claude Code Subagent Analysis

Run AFTER the Python pipeline produces structured data.

### Per-Category Analysis (parallel agents, one per category group)
Each agent receives: category name, event titles + descriptions, keyword rankings, slide text excerpts.
Produces per category:
1. Top 5 themes/trends, each classified as **emerging** / **growing** / **established**
2. CNCF/open-source projects mentioned with context
3. Surprising or counter-trend talks
4. Where this track says the industry is heading

### Cross-Cutting Synthesis (single agent)
Receives all per-category analyses + trend_findings.json + org_findings.json.
Produces:
1. Meta-themes spanning multiple tracks
2. Technologies appearing in unexpected places
3. The narrative arc of KubeCon EU 2026
4. Year-over-year evolution signals
5. "One to watch" predictions

---

## New Dashboard Views (powered by enriched.json)

1. **Emerging vs. Established Quadrant** — scatter plot, frequency × maturity, per technology
2. **AI Penetration Heatmap** — % of AI-related keywords per non-AI track
3. **Organization Leaderboard** — top companies by speaker count, with track breakdown
4. **End-User vs. Vendor Ratio** — stacked bar per track (high end-user = production maturity)
5. **Architecture Patterns from Slides** — sidecar, gateway, operator, GitOps mentions
6. **Narrative Report Section** — written insights from Claude subagent synthesis

---

## How to Run

### Step 1: Set up Python environment
```bash
cd analysis
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m nltk.downloader punkt stopwords averaged_perceptron_tagger
```

### Step 2: Run Python pipeline
```bash
python 01_load_metadata.py
python 02_extract_slide_text.py
python 03_normalize_companies.py
python 04_extract_keywords.py
python 05_trend_analysis.py
python 06_org_analysis.py
python 07_generate_enriched.py
```

### Step 3: Run Claude Code subagent analysis
Start a new Claude Code session and say:
```
Read analysis/PLAN.md. The Python pipeline is complete and outputs are in analysis/cache/.
Run the Claude Code subagent semantic analysis as described in the plan:
1. Dispatch parallel agents for per-category analysis
2. Then run cross-cutting synthesis
3. Update enriched.json with semantic findings
```

### Step 4: Update dashboard
```bash
cp analysis/output/enriched.json dashboard/public/data/
# Add new dashboard components for the enriched views
# Commit and push — GitHub Actions deploys automatically
```

---

## Spec-Driven Development

Same approach as Phase 1:
1. **Spec agent** writes specs for each Python script in `analysis/specs/`
2. **Implementor agents** build scripts from specs (parallel where possible)
3. **Run `/simplify`** after each step
