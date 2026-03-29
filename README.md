# KubeCon + CloudNativeCon Europe 2026 - Schedule & Slides

Scrapers for extracting talk metadata and downloading presentation slides from the KubeCon + CloudNativeCon Europe 2026 conference events (Amsterdam, March 22-27, 2026).

## Events Covered

| Event | Site | Script |
|-------|------|--------|
| KubeCon + CloudNativeCon Europe 2026 | [kccnceu2026.sched.com](https://kccnceu2026.sched.com) | `kubecon-cloudnative-eu-2026/download_kubecon_slides.py` |
| CNCF-hosted Co-located Events Europe 2026 | [colocatedeventseu2026.sched.com](https://colocatedeventseu2026.sched.com) | `cncf-hosted-co-located-events-eu-2026/download_colocated_slides.py` |

The co-located events include: ArgoCon, BackstageCon, CiliumCon, FluxCon, KeycloakCon, KyvernoCon, WasmCon, Observability Day, Platform Engineering Day, Cloud Native AI + Kubeflow Day, Agentics Day: MCP + Agents, and more.

## What Gets Extracted

For each talk:
- Title, description, date/time, venue
- Speakers (name, title, bio)
- Event type and experience level
- Attached slide files (PDF/PPTX) - downloaded locally

All metadata is saved to `index.json` grouped by event type.

## Usage

```bash
cd kubecon-cloudnative-eu-2026   # or cncf-hosted-co-located-events-eu-2026
python3 -m venv .venv
source .venv/bin/activate
pip install requests beautifulsoup4
python3 download_kubecon_slides.py   # or download_colocated_slides.py
```

## Note on Slides

Slide files (PDF/PPTX) are not included in this repository as they are copyrighted by their respective speakers. Run the scripts to download them directly from sched.com.
