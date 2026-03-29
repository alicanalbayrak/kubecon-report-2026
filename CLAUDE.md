# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scrapers for KubeCon + CloudNativeCon Europe 2026 conference data from sched.com. Each subdirectory targets a different sched.com event site, extracting talk metadata (title, description, speakers, venue, date/time, experience level) and downloading attached slide files (PDF/PPTX).

## Repository Structure

- `kubecon-cloudnative-eu-2026/` - Main KubeCon conference (`kccnceu2026.sched.com`)
- `cncf-hosted-co-located-events-eu-2026/` - Co-located events (`colocatedeventseu2026.sched.com`)

Each directory contains:
- `download_*_slides.py` - The scraper script
- `*_slides/` - Output directory with `index.json` and slide files organized by event type
- `.venv/` - Python virtual environment (if present)

## Running the Scrapers

```bash
cd <event-directory>
python3 -m venv .venv
source .venv/bin/activate
pip install requests beautifulsoup4
python3 download_*_slides.py
```

## How the Scrapers Work

All scrapers follow the same three-phase pattern:

1. **Discover events** - Iterate through `FILTER_TYPES` list, fetch each type's overview page, extract event URLs via `<a href="event/...">` links
2. **Scrape metadata** - Visit each event page, extract fields using CSS selectors (`.tip-description`, `.sched-person-session`, `.list-single__date`, etc.) and JSON-LD structured data
3. **Download files** - Collect PDF/PPTX links from event pages, deduplicate by URL, download to type-named subdirectories

Output is a single `index.json` with all metadata grouped by event type.

## Adding a New Conference Scraper

Copy an existing script and change:
- `BASE_URL` - The sched.com subdomain
- `OUTPUT_DIR` - Output folder name
- `FILTER_TYPES` - List of `(display_name, url_path)` tuples (extract from the sidebar HTML of the sched.com site)
- Conference metadata in the `index` dict (`conference`, `dates`, `location`)

CSS selectors are consistent across sched.com sites and should not need changes.
