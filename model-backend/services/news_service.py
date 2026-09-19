"""
Fetch real-time financial/personal finance news from NewsAPI.org.
Requires NEWS_API_KEY in .env (get one at https://newsapi.org/register).
If no key or request fails, returns a fallback list so the UI still works.
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import List, Dict, Any

NEWS_API_BASE = "https://newsapi.org/v2/everything"
DEFAULT_QUERY = "personal finance investment savings"
PAGE_SIZE = 8


def _fetch_news_api() -> List[Dict[str, Any]]:
    key = os.environ.get("NEWS_API_KEY", "").strip()
    if not key:
        return []

    params = {
        "q": DEFAULT_QUERY,
        "apiKey": key,
        "pageSize": PAGE_SIZE,
        "sortBy": "publishedAt",
        "language": "en",
    }
    url = f"{NEWS_API_BASE}?q={urllib.parse.quote(params['q'])}&apiKey={params['apiKey']}&pageSize={params['pageSize']}&sortBy={params['sortBy']}&language={params['language']}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FinanceCompanion/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except (urllib.error.URLError, json.JSONDecodeError, OSError):
        return []

    articles = data.get("articles") or []
    return [
        {
            "title": a.get("title") or "No title",
            "url": a.get("url") or "",
            "source": (a.get("source") or {}).get("name") or "Unknown",
            "publishedAt": a.get("publishedAt") or "",
            "imageUrl": a.get("urlToImage") or "",
        }
        for a in articles
        if a.get("title") and a.get("url")
    ]


def get_financial_news() -> List[Dict[str, Any]]:
    """Return list of { title, url, source, publishedAt, imageUrl }. Uses fallback if API fails or no key."""
    items = _fetch_news_api()
    if items:
        return items
    # Fallback when no API key or request failed
    return [
        {"title": "Markets rally as inflation cools", "source": "Bloomberg", "url": "", "publishedAt": "", "imageUrl": ""},
        {"title": "Why diversification matters in 2026", "source": "Financial Times", "url": "", "publishedAt": "", "imageUrl": ""},
        {"title": "Savings and investment tips for beginners", "source": "Editorial", "url": "", "publishedAt": "", "imageUrl": ""},
    ]
