# KubeCon + CloudNativeCon Europe 2026 — Schedule, Slides & Analysis

> **880 talks. 337 slide decks. One interactive dashboard.**
>
> End-to-end data pipeline for KubeCon + CloudNativeCon Europe 2026 (Amsterdam, March 22-27): scrapes talk metadata from sched.com, downloads slides, extracts text, runs quantitative and AI-powered semantic analysis, and serves everything through a React dashboard.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Events Covered](#events-covered)
- [Scrapers](#scrapers)
- [Analysis Pipeline](#analysis-pipeline)
- [Dashboard](#dashboard)
- [Data Schema](#data-schema)
- [Note on Slides](#note-on-slides)

## Quick Start

```bash
# 1. Scrape conference data
cd kubecon-cloudnative-eu-2026
python3 -m venv .venv && source .venv/bin/activate
pip install requests beautifulsoup4
python3 download_kubecon_slides.py

# 2. Run analysis pipeline
cd ../analysis
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m nltk.downloader punkt stopwords averaged_perceptron_tagger
for f in 0*.py; do python "$f"; done

# 3. Launch dashboard
cd ../dashboard
npm install && npm run dev
```

## Project Structure

```
.
├── kubecon-cloudnative-eu-2026/       # Main KubeCon scraper + data
│   ├── download_kubecon_slides.py
│   └── kubecon_slides/index.json
├── cncf-hosted-co-located-events-eu-2026/  # Co-located events scraper + data
│   ├── download_colocated_slides.py
│   └── colocated_slides/index.json
├── analysis/                          # Two-layer analysis pipeline
│   ├── 01_load_metadata.py            #   Flatten index.json files
│   ├── 02_extract_slide_text.py       #   PDF/PPTX text extraction
│   ├── 03_normalize_companies.py      #   Company name normalization
│   ├── 04_extract_keywords.py         #   TF-IDF keyword extraction
│   ├── 05_trend_analysis.py           #   Category depth, tech mentions
│   ├── 06_org_analysis.py             #   Org leaderboard, end-user vs vendor
│   ├── 07_generate_enriched.py        #   Assemble enriched.json
│   ├── PLAN.md                        #   Pipeline design document
│   └── output/enriched.json           #   Final output consumed by dashboard
└── dashboard/                         # React + Tailwind interactive dashboard
    ├── src/
    └── public/data/                   #   enriched.json served here
```

## Events Covered

| Event | Site | Scraper |
|-------|------|---------|
| KubeCon + CloudNativeCon Europe 2026 | [kccnceu2026.sched.com](https://kccnceu2026.sched.com) | `kubecon-cloudnative-eu-2026/download_kubecon_slides.py` |
| CNCF-hosted Co-located Events Europe 2026 | [colocatedeventseu2026.sched.com](https://colocatedeventseu2026.sched.com) | `cncf-hosted-co-located-events-eu-2026/download_colocated_slides.py` |

Co-located events include: ArgoCon, BackstageCon, CiliumCon, FluxCon, KeycloakCon, KyvernoCon, WasmCon, Observability Day, Platform Engineering Day, Cloud Native AI + Kubeflow Day, Agentics Day: MCP + Agents, and more.

### What Gets Extracted

For each talk:
- Title, description, date/time, venue
- Speakers (name, title, bio)
- Event type and experience level
- Attached slide files (PDF/PPTX) — downloaded locally

All metadata is saved to `index.json` grouped by event type.

## Scrapers

All scrapers follow the same three-phase pattern:

1. **Discover events** — Iterate through `FILTER_TYPES`, fetch each type's overview page, extract event URLs
2. **Scrape metadata** — Visit each event page, extract fields using CSS selectors and JSON-LD structured data
3. **Download files** — Collect PDF/PPTX links, deduplicate by URL, download to type-named subdirectories

```bash
cd kubecon-cloudnative-eu-2026   # or cncf-hosted-co-located-events-eu-2026
python3 -m venv .venv
source .venv/bin/activate
pip install requests beautifulsoup4
python3 download_kubecon_slides.py   # or download_colocated_slides.py
```

### Adding a New Conference

Copy an existing scraper and change `BASE_URL`, `OUTPUT_DIR`, `FILTER_TYPES`, and the conference metadata. CSS selectors are consistent across sched.com sites and shouldn't need changes.

## Analysis Pipeline

The `analysis/` directory contains a two-layer pipeline that produces `enriched.json` — a single file the dashboard consumes for all views.

### Architecture

```
Layer 1: Python Pipeline (quantitative)
  Extract slide text -> Merge metadata -> Normalize companies -> TF-IDF keywords
  -> Trend analysis -> Org analysis -> Generate enriched.json

Layer 2: Claude Code Subagents (semantic)
  Read extracted data -> Per-category theme analysis (7 parallel agents)
  -> Cross-cutting synthesis -> Update enriched.json
```

Python handles PDF parsing, TF-IDF math, and company normalization. Claude Code subagents handle semantic understanding: identifying themes, finding cross-domain patterns, and writing narrative insight. No API key is needed — subagents run locally via Claude Code.

### Layer 1: Python Scripts

| Script | Purpose | Output |
|--------|---------|--------|
| `01_load_metadata.py` | Flatten both `index.json` into unified event list | `cache/events_unified.json` |
| `02_extract_slide_text.py` | Extract text from 337 PDF/PPTX decks via PyMuPDF/python-pptx | `cache/slide_texts.json` |
| `03_normalize_companies.py` | Alias table + fuzzy matching for company names | `cache/company_map.json` |
| `04_extract_keywords.py` | TF-IDF keyword extraction per event and per category | `cache/event_keywords.json`, `cache/category_keywords.json` |
| `05_trend_analysis.py` | Category depth matrix, tech mentions, keyword clusters | `cache/trend_findings.json` |
| `06_org_analysis.py` | Org leaderboard, end-user vs vendor ratio, company heatmap | `cache/org_findings.json` |
| `07_generate_enriched.py` | Combine all outputs into dashboard-ready JSON | `output/enriched.json` |

```bash
cd analysis
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m nltk.downloader punkt stopwords averaged_perceptron_tagger

python 01_load_metadata.py
python 02_extract_slide_text.py
python 03_normalize_companies.py
python 04_extract_keywords.py
python 05_trend_analysis.py
python 06_org_analysis.py
python 07_generate_enriched.py
```

### Layer 2: Claude Code Subagent Analysis

After the Python pipeline populates `analysis/cache/`, Claude Code subagents perform semantic analysis: identifying themes, rating their maturity, finding surprising cross-domain patterns, and writing a narrative arc for the conference.

**How it works:**

1. **Per-category analysis (parallel)** — 7 agents run simultaneously, each covering a group of related categories (AI & Data, Platform & Ops, Security & Networking, Observability & Edge, GitOps & DevEx, Community & Ecosystem, Showcases & Keynotes). Each agent returns structured JSON with:
   - Top 5 themes per category, each rated as **emerging** / **growing** / **established**
   - CNCF/open-source projects mentioned with context
   - Surprising or counter-trend talks
   - Industry direction statement

2. **Cross-cutting synthesis (single agent)** — Receives all 7 per-category analyses plus `trend_findings.json` and `org_findings.json`. Produces:
   - **Meta-themes** spanning 3+ tracks (e.g., "AI Agents as First-Class Infrastructure Citizens" appeared in 11 tracks)
   - **Unexpected technology appearances** across domains
   - **Narrative arc** for the conference (title: *"The Infrastructure Learns to Think"*)
   - **Evolution signals** (industry shifts with from/to states)
   - **Ones to watch** (predictions for the next 12-18 months)

3. **Merge** — Results are written to `enriched.json` under `semantic_analysis.per_category` and `semantic_analysis.cross_cutting`, then copied to `dashboard/public/data/`.

**To run it**, start a Claude Code session in this repo and say:

```
The Python pipeline is complete. Now run the Claude Code subagent
semantic analysis as described in analysis/PLAN.md.
```

See [`analysis/PLAN.md`](analysis/PLAN.md) for full pipeline design details.

## Dashboard

An interactive React dashboard for exploring the conference data. Built with React 19, Tailwind CSS 4, Recharts, and Vite.

### Features

The dashboard has three tabs:

- **Overview** — Top keywords, CNCF project mentions, trending topics, track distribution, experience level breakdown, bigram analysis, speaker leaderboard, and full session list with search/filter
- **Deep Analysis** — Emerging technology quadrant, AI penetration across non-AI tracks, org leaderboard, end-user vs vendor ratio, and architecture pattern frequency
- **Narrative** — AI-generated conference narrative arc, meta-themes spanning multiple tracks, evolution signals, ones to watch, and unexpected technology appearances

All views support filtering by source (KubeCon vs co-located events) and free-text search.

### Running the Dashboard

```bash
cd dashboard
npm install
npm run dev       # development server at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview production build
```

The dashboard reads data from `public/data/` — copy `analysis/output/enriched.json` there after running the pipeline.

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| Tailwind CSS | 4 | Styling |
| Recharts | 3 | Charts and visualizations |
| Vite | 8 | Build tool and dev server |
| TypeScript | 5.9 | Type safety |

## Data Schema

The final `enriched.json` (v2.1) contains:

| Section | Contents |
|---------|----------|
| `metadata` | Event/slide counts, generation timestamps |
| `org_leaderboard` | Top 30 companies by speaker count with track breakdown |
| `keyword_trends` | TF-IDF keywords by category, tech mention frequencies |
| `ai_penetration` | % AI-related keywords per non-AI track |
| `category_depth_matrix` | Event count, slide count, avg description length per category |
| `architecture_patterns` | Mentions of sidecar, gateway, operator, GitOps per track |
| `track_enduser_ratio` | End-user vs vendor speaker ratio per track |
| `company_topic_heatmap` | Company-to-category matrix |
| `events` | All 880 events with normalized metadata and keywords |
| `semantic_analysis.per_category` | Theme/maturity analysis for 35 categories |
| `semantic_analysis.cross_cutting` | 8 meta-themes, narrative arc, 7 evolution signals, 7 predictions |

## Note on Slides

Slide files (PDF/PPTX) are not included in this repository — they are copyrighted by their respective speakers. Run the scrapers to download them directly from sched.com.
