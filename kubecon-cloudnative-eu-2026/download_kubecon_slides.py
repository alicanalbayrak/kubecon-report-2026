#!/usr/bin/env python3
"""
KubeCon Europe 2026 - Schedule Scraper & Slide Downloader

Uses requests + BeautifulSoup (NO browser needed — the pages are server-rendered).
Iterates through every filter type, visits each event, downloads PDF/PPTX files.
Files are organized into folders named after the filter type.
Generates a JSON index (index.json) with full metadata for every event.

Setup:
    pip3 install requests beautifulsoup4

Usage:
    python3 download_kubecon_slides.py
"""

import json
import os
import re
import sys
import time
import logging
import urllib.parse
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── Configuration ───────────────────────────────────────────────────────────
BASE_URL = "https://kccnceu2026.sched.com"
OUTPUT_DIR = Path("kubecon_eu_2026_slides")
EXTENSIONS = (".pdf", ".pptx", ".ppt")
REQUEST_DELAY = 0.5  # seconds between requests (be polite)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
})

# ── Known filter types extracted from the actual HTML ──────────────────────
FILTER_TYPES = [
    ("Tutorials",                      "overview/type/%F0%9F%93%9A+Tutorials"),
    ("Contribfest",                    "overview/type/%F0%9F%9A%A8+Contribfest"),
    ("Poster Sessions",                "overview/type/%F0%9F%AA%A7+Poster+Sessions"),
    ("AI + ML",                        "overview/type/AI+%2B+ML"),
    ("Application Development",        "overview/type/Application+Development"),
    ("Breaks",                         "overview/type/Breaks"),
    ("Lightning Talks",                "overview/type/%E2%9A%A1+Lightning+Talks"),
    ("Cloud Native Experience",        "overview/type/Cloud+Native+Experience"),
    ("Cloud Native Novice",            "overview/type/Cloud+Native+Novice"),
    ("CNCF-hosted Co-located Events",  "overview/type/CNCF-hosted+Co-located+Events"),
    ("Connectivity",                   "overview/type/Connectivity"),
    ("Data Processing + Storage",      "overview/type/Data+Processing+%2B+Storage"),
    ("Emerging + Advanced",            "overview/type/Emerging+%2B+Advanced"),
    ("Experiences",                    "overview/type/Experiences"),
    ("Inclusion + Accessibility",      "overview/type/Inclusion+%2B+Accessibility"),
    ("Keynote Sessions",               "overview/type/Keynote+Sessions"),
    ("Maintainer Track",               "overview/type/Maintainer+Track"),
    ("Observability",                  "overview/type/Observability"),
    ("Operations + Performance",       "overview/type/Operations+%2B+Performance"),
    ("Platform Engineering",           "overview/type/Platform+Engineering"),
    ("Project Opportunities",          "overview/type/Project+Opportunities"),
    ("Registration",                   "overview/type/Registration"),
    ("Security",                       "overview/type/Security"),
    ("Solutions Showcase",             "overview/type/Solutions+Showcase"),
    ("Sponsor-hosted Co-located Event","overview/type/Sponsor-hosted+Co-located+Event"),
    ("Sponsored Sessions",             "overview/type/Sponsored+Sessions"),
]


def safe_filename(name: str) -> str:
    """Sanitize a string for use as a file/folder name."""
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name[:200]


def fetch(url: str) -> requests.Response | None:
    """GET with retries."""
    for attempt in range(3):
        try:
            r = session.get(url, timeout=30)
            return r
        except requests.RequestException as exc:
            log.warning("  Attempt %d failed for %s: %s", attempt + 1, url, exc)
            time.sleep(2 ** attempt)
    return None


# ── Step 1: Get event URLs from a type page ────────────────────────────────

def get_event_urls(type_url: str, type_name: str) -> list[dict]:
    """Fetch a type-filtered schedule page and extract event links."""
    full_url = f"{BASE_URL}/{type_url}"
    log.info("  Loading %s", full_url)

    r = fetch(full_url)
    if r is None:
        log.error("  ✗ FAILED to fetch type page '%s' (network error after retries)", type_name)
        return []

    if r.status_code == 404:
        log.error("  ✗ TYPE PAGE NOT FOUND (404) for '%s'", type_name)
        log.error("    URL: %s", full_url)
        return []
    elif r.status_code >= 400:
        log.error("  ✗ HTTP %d error for type '%s'", r.status_code, type_name)
        return []
    else:
        log.info("    HTTP %d OK", r.status_code)

    soup = BeautifulSoup(r.text, "html.parser")
    events = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if re.match(r'^/?event/', href):
            title = a.get_text(strip=True)
            full = href if href.startswith("http") else f"{BASE_URL}/{href.lstrip('/')}"
            if full not in seen:
                seen.add(full)
                events.append({"url": full, "title": title})

    if not events:
        page_text = soup.get_text()
        if "page not found" in page_text.lower():
            log.error("  ✗ Page content indicates 404 for '%s'", type_name)
        else:
            log.warning("  ⚠ 0 events found for '%s'", type_name)
    else:
        log.info("    → %d events found", len(events))

    return events


# ── Step 2: Visit an event page — extract metadata + downloadable files ────

def scrape_event_page(event_url: str) -> dict | None:
    """
    Visit an event page and extract full metadata:
      - title, description, date/time, venue, speakers, type/category
      - downloadable file URLs (PDF/PPTX)
      - experience level
    Returns a dict with all metadata, or None on failure.
    """
    r = fetch(event_url)
    if r is None:
        log.warning("      ✗ Could not fetch event page (network error)")
        return None
    if r.status_code >= 400:
        log.warning("      ✗ HTTP %d for event page", r.status_code)
        return None

    soup = BeautifulSoup(r.text, "html.parser")

    metadata: dict = {
        "url": event_url,
        "title": "",
        "description": "",
        "date_time": "",
        "venue": "",
        "speakers": [],
        "type": "",
        "experience_level": "",
        "files": [],
    }

    # ── Title ──
    # From the event header: <a class="name" ...>Title</a>
    name_el = soup.select_one("a.name")
    if name_el:
        metadata["title"] = name_el.get_text(strip=True)

    # ── Description ──
    desc_el = soup.select_one(".tip-description")
    if desc_el:
        # Get text, converting <br> to newlines
        for br in desc_el.find_all("br"):
            br.replace_with("\n")
        metadata["description"] = desc_el.get_text(strip=True)

    # ── Date/Time ──
    date_el = soup.select_one(".list-single__date")
    if date_el:
        metadata["date_time"] = date_el.get_text(strip=True)

    # ── Venue ──
    venue_el = soup.select_one(".list-single__location a")
    if venue_el:
        metadata["venue"] = venue_el.get_text(strip=True)

    # ── Speakers ──
    for person in soup.select(".sched-person-session"):
        speaker: dict = {"name": "", "title": "", "bio": ""}
        name_link = person.select_one("h2 a")
        if name_link:
            speaker["name"] = name_link.get_text(strip=True)
        role_el = person.select_one(".sched-event-details-role-company")
        if role_el:
            speaker["title"] = role_el.get_text(strip=True)
        bio_el = person.select_one(".sched-person-session-role")
        if bio_el:
            speaker["bio"] = bio_el.get_text(strip=True)
        if speaker["name"]:
            metadata["speakers"].append(speaker)

    # ── Type / Category ──
    type_el = soup.select_one(".sched-event-type a")
    if type_el:
        metadata["type"] = type_el.get_text(strip=True)

    # ── Experience Level ──
    for li in soup.select(".tip-custom-fields li"):
        strong = li.find("strong")
        if strong and "Experience Level" in strong.get_text():
            level_link = li.find("a")
            if level_link:
                metadata["experience_level"] = level_link.get_text(strip=True)

    # ── Downloadable files (PDF/PPTX) ──
    for a in soup.find_all("a", href=True):
        href = a["href"]
        href_lower = href.lower()
        if any(ext in href_lower for ext in EXTENSIONS):
            full_url = href if href.startswith("http") else urllib.parse.urljoin(event_url, href)
            parsed = urllib.parse.urlparse(full_url)
            fname = os.path.basename(parsed.path)
            if not fname or fname == "/":
                fname = a.get_text(strip=True) or "download"
            if not any(fname.lower().endswith(ext) for ext in EXTENSIONS):
                for ext in EXTENSIONS:
                    if ext in href_lower:
                        fname += ext
                        break
            fname = urllib.parse.unquote(fname)
            metadata["files"].append({
                "url": full_url,
                "filename": safe_filename(fname),
            })

    # Also try to get structured data from the JSON-LD script
    ld_script = soup.find("script", type="application/ld+json")
    if ld_script:
        try:
            ld = json.loads(ld_script.string)
            if not metadata["title"] and ld.get("name"):
                metadata["title"] = ld["name"]
            if not metadata["description"] and ld.get("description"):
                # Clean HTML from JSON-LD description
                desc_soup = BeautifulSoup(ld["description"], "html.parser")
                metadata["description"] = desc_soup.get_text(separator="\n").strip()
            if ld.get("startDate"):
                metadata["start_date"] = ld["startDate"]
            if ld.get("endDate"):
                metadata["end_date"] = ld["endDate"]
        except (json.JSONDecodeError, TypeError):
            pass

    return metadata


# ── Step 3: Download a file ────────────────────────────────────────────────

def download_file(url: str, dest: Path) -> bool:
    """Download a file via HTTP."""
    if dest.exists():
        log.info("      ✓ Already exists: %s", dest.name)
        return True

    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        r = session.get(url, timeout=60, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        size_kb = dest.stat().st_size / 1024
        log.info("      ✓ Downloaded: %s (%.1f KB)", dest.name, size_kb)
        return True
    except Exception as exc:
        log.error("      ✗ Failed to download %s: %s", url, exc)
        return False


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # The full index: grouped by type
    index: dict = {
        "conference": "KubeCon + CloudNativeCon Europe 2026",
        "dates": "March 22-27, 2026",
        "location": "Amsterdam, Netherlands",
        "base_url": BASE_URL,
        "types": {},
    }

    all_downloads: list[tuple[str, str, str]] = []  # (url, filename, folder)
    total_events = 0
    empty_types: list[str] = []
    successful_types: list[str] = []
    failed_event_urls: list[str] = []

    for display_name, type_path in FILTER_TYPES:
        folder_name = safe_filename(display_name)

        log.info("━" * 60)
        log.info("TYPE: %s", display_name)
        log.info("━" * 60)

        events = get_event_urls(type_path, display_name)

        if not events:
            empty_types.append(display_name)
            index["types"][display_name] = {"event_count": 0, "events": []}
        else:
            successful_types.append(f"{display_name} ({len(events)} events)")

        total_events += len(events)
        type_events: list[dict] = []

        for i, event in enumerate(events, 1):
            title_short = (event.get("title") or event["url"])[:80]
            log.info("  [%d/%d] %s", i, len(events), title_short)

            metadata = scrape_event_page(event["url"])

            if metadata is None:
                failed_event_urls.append(event["url"])
                # Still record the event in the index with minimal info
                type_events.append({
                    "url": event["url"],
                    "title": event.get("title", ""),
                    "error": "Failed to fetch event page",
                })
                continue

            # Record files for download
            for f in metadata["files"]:
                log.info("      📎 Found: %s", f["filename"])
                # Add local path info to the metadata
                f["local_path"] = f"{folder_name}/{f['filename']}"
                all_downloads.append((f["url"], f["filename"], folder_name))

            type_events.append(metadata)
            time.sleep(REQUEST_DELAY)

        index["types"][display_name] = {
            "event_count": len(events),
            "events": type_events,
        }

    # ── Save JSON index ────────────────────────────────────────────────
    index_path = OUTPUT_DIR / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    log.info("")
    log.info("📋 Index saved to: %s", index_path.resolve())

    # ── Integrity Report ───────────────────────────────────────────────
    log.info("")
    log.info("=" * 60)
    log.info("INTEGRITY REPORT")
    log.info("=" * 60)
    log.info("Filter types processed: %d / %d", len(FILTER_TYPES), len(FILTER_TYPES))
    log.info("  ✓ Types with events:    %d", len(successful_types))
    for t in successful_types:
        log.info("      ✓ %s", t)
    log.info("  ⚠ Types with 0 events:  %d", len(empty_types))
    for t in empty_types:
        log.info("      ⚠ %s", t)
    if failed_event_urls:
        log.info("  ✗ Event pages failed:   %d", len(failed_event_urls))
        for u in failed_event_urls:
            log.info("      ✗ %s", u)
    log.info("")

    # ── Download phase ─────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("Scanning complete: %d events, %d files to download", total_events, len(all_downloads))
    log.info("=" * 60)

    if not all_downloads:
        log.info("No PDF/PPTX files found across all events.")
        return

    # Deduplicate by URL
    seen_urls = set()
    unique_downloads = []
    for url, filename, folder in all_downloads:
        if url not in seen_urls:
            seen_urls.add(url)
            unique_downloads.append((url, filename, folder))

    log.info("Downloading %d unique files …", len(unique_downloads))

    success = 0
    failed = 0
    for url, filename, folder in unique_downloads:
        dest = OUTPUT_DIR / folder / filename
        if download_file(url, dest):
            success += 1
        else:
            failed += 1

    # ── Final Summary ──────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("DONE — %d downloaded, %d failed", success, failed)
    log.info("Files saved in: %s/", OUTPUT_DIR.resolve())
    log.info("Index file:     %s", index_path.resolve())
    log.info("=" * 60)

    for type_dir in sorted(OUTPUT_DIR.iterdir()):
        if type_dir.is_dir():
            files_in_dir = list(type_dir.iterdir())
            if files_in_dir:
                log.info("  📁 %s/ (%d files)", type_dir.name, len(files_in_dir))
                for f in sorted(files_in_dir):
                    log.info("      📄 %s", f.name)


if __name__ == "__main__":
    main()
