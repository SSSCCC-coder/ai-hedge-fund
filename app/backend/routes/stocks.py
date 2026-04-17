"""Stock search endpoint — queries Yahoo Finance's public autocomplete API."""

import asyncio
import logging
import requests

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter()

_YF_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}
# Fallback URL if the primary one is throttled
_YF_SEARCH_URL_2 = "https://query2.finance.yahoo.com/v1/finance/search"


def _yahoo_search(q: str, max_results: int = 10) -> list[dict]:
    """
    Hit Yahoo Finance's public autocomplete endpoint.
    Returns a list of quote dicts, each containing at minimum 'symbol'.
    """
    params = {
        "q": q,
        "quotesCount": max_results,
        "newsCount": 0,
        "enableFuzzyQuery": True,
        "quotesQueryId": "tss_match_phrase_query",
    }
    for url in (_YF_SEARCH_URL, _YF_SEARCH_URL_2):
        try:
            resp = requests.get(url, params=params, headers=_HEADERS, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("quotes", [])
        except Exception as exc:
            logger.debug("Yahoo Finance search error (%s): %s", url, exc)
    return []


def _infer_sector(quote: dict) -> str:
    qt = (quote.get("quoteType") or "").upper()
    return {
        "ETF":            "ETF",
        "MUTUALFUND":     "Fund",
        "INDEX":          "Index",
        "CRYPTOCURRENCY": "Crypto",
        "FUTURE":         "Futures",
        "CURRENCY":       "Currency",
    }.get(qt, "")


@router.get("/stocks/search")
async def search_stocks(q: str = Query(..., min_length=1, max_length=50)):
    """
    Search for stocks by ticker symbol or company name.
    Uses Yahoo Finance's public autocomplete API (no key required).
    Falls back gracefully to an empty list on any error.
    """
    try:
        loop = asyncio.get_running_loop()
        quotes = await loop.run_in_executor(None, lambda: _yahoo_search(q))

        results = []
        for r in quotes:
            ticker = r.get("symbol", "")
            if not ticker:
                continue
            results.append({
                "ticker":   ticker,
                "name":     r.get("shortname") or r.get("longname") or "",
                "sector":   r.get("sector") or _infer_sector(r),
                "exchange": r.get("exchDisp") or r.get("exchange") or "",
                "type":     r.get("quoteType", "EQUITY"),
            })

        return {"results": results, "query": q}

    except Exception as e:
        logger.warning("Stock search failed for %r: %s", q, e)
        return {"results": [], "query": q}
