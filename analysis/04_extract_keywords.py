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
