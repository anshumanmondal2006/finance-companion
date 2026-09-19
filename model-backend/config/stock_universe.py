"""
Diversified NSE (.NS) universe for screening ~100 names and selecting a smaller top-N list.

Sectors are coarse buckets used only to cap concentration (e.g. avoid 10 bank names).
Symbols are liquid Nifty-style names; yfinance may occasionally fail for a few — selector falls back.
"""

from __future__ import annotations

# (ticker, sector_key) — sector_key groups "banks" vs "IT" vs "pharma", etc.
_STOCK_ROWS: list[tuple[str, str]] = [
    # Energy & utilities
    ("RELIANCE.NS", "energy"),
    ("ONGC.NS", "energy"),
    ("IOC.NS", "energy"),
    ("GAIL.NS", "energy"),
    ("NTPC.NS", "energy"),
    ("POWERGRID.NS", "energy"),
    ("COALINDIA.NS", "energy"),
    ("TATAPOWER.NS", "energy"),
    ("ADANIGREEN.NS", "energy"),
    # Materials (steel, metals, cement, chemicals)
    ("TATASTEEL.NS", "materials"),
    ("JSWSTEEL.NS", "materials"),
    ("HINDALCO.NS", "materials"),
    ("VEDL.NS", "materials"),
    ("SAIL.NS", "materials"),
    ("JINDALSTEL.NS", "materials"),
    ("ULTRACEMCO.NS", "materials"),
    ("SHREECEM.NS", "materials"),
    ("ACC.NS", "materials"),
    ("AMBUJACEM.NS", "materials"),
    ("GRASIM.NS", "materials"),
    ("UPL.NS", "materials"),
    ("PIDILITIND.NS", "materials"),
    # IT
    ("TCS.NS", "it"),
    ("INFY.NS", "it"),
    ("HCLTECH.NS", "it"),
    ("WIPRO.NS", "it"),
    ("TECHM.NS", "it"),
    ("LTIM.NS", "it"),
    ("PERSISTENT.NS", "it"),
    ("COFORGE.NS", "it"),
    ("MPHASIS.NS", "it"),
    ("NAUKRI.NS", "it"),
    # Pharma & healthcare
    ("SUNPHARMA.NS", "pharma"),
    ("DRREDDY.NS", "pharma"),
    ("CIPLA.NS", "pharma"),
    ("DIVISLAB.NS", "pharma"),
    ("LUPIN.NS", "pharma"),
    ("BIOCON.NS", "pharma"),
    ("AUROPHARMA.NS", "pharma"),
    ("TORNTPHARM.NS", "pharma"),
    ("ALKEM.NS", "pharma"),
    ("ZYDUSLIFE.NS", "pharma"),
    ("APOLLOHOSP.NS", "healthcare"),
    # FMCG & staples
    ("HINDUNILVR.NS", "fmcg"),
    ("ITC.NS", "fmcg"),
    ("NESTLEIND.NS", "fmcg"),
    ("BRITANNIA.NS", "fmcg"),
    ("DABUR.NS", "fmcg"),
    ("MARICO.NS", "fmcg"),
    ("TATACONSUM.NS", "fmcg"),
    ("GODREJCP.NS", "fmcg"),
    # Auto
    ("MARUTI.NS", "auto"),
    ("M&M.NS", "auto"),
    ("EICHERMOT.NS", "auto"),
    ("HEROMOTOCO.NS", "auto"),
    ("BAJAJ-AUTO.NS", "auto"),
    # Banks (many in universe; selection caps how many can appear in top 10)
    ("HDFCBANK.NS", "bank"),
    ("ICICIBANK.NS", "bank"),
    ("SBIN.NS", "bank"),
    ("KOTAKBANK.NS", "bank"),
    ("AXISBANK.NS", "bank"),
    ("INDUSINDBK.NS", "bank"),
    ("BANDHANBNK.NS", "bank"),
    ("IDFCFIRSTB.NS", "bank"),
    ("PNB.NS", "bank"),
    ("BANKBARODA.NS", "bank"),
    ("AUBANK.NS", "bank"),
    ("FEDERALBNK.NS", "bank"),
    ("CANBK.NS", "bank"),
    ("UNIONBANK.NS", "bank"),
    # NBFC & insurance
    ("BAJAJFINSV.NS", "nbfc_insurance"),
    ("CHOLAFIN.NS", "nbfc_insurance"),
    ("MUTHOOTFIN.NS", "nbfc_insurance"),
    ("SBILIFE.NS", "nbfc_insurance"),
    ("HDFCLIFE.NS", "nbfc_insurance"),
    ("LICI.NS", "nbfc_insurance"),
    # Consumer discretionary & durables
    ("TITAN.NS", "consumer"),
    ("ASIANPAINT.NS", "consumer"),
    ("BERGEPAINT.NS", "consumer"),
    ("PAGEIND.NS", "consumer"),
    ("TRENT.NS", "consumer"),
    ("VBL.NS", "consumer"),
    ("HAVELLS.NS", "consumer"),
    ("DMART.NS", "consumer"),
    ("POLYCAB.NS", "consumer"),
    # Industrials & infra
    ("LT.NS", "industrial"),
    ("SIEMENS.NS", "industrial"),
    ("ADANIPORTS.NS", "industrial"),
    ("CONCOR.NS", "industrial"),
    ("ADANIENT.NS", "industrial"),
    # Telecom & media
    ("BHARTIARTL.NS", "telecom"),
    ("ZEEL.NS", "telecom"),
    ("TATACOMM.NS", "telecom"),
    # Realty
    ("DLF.NS", "realty"),
    ("OBEROIRLTY.NS", "realty"),
    # Transport & consumer infra
    ("INDIGO.NS", "transport"),
    ("IRCTC.NS", "transport"),
]

SECTOR_BY_TICKER: dict[str, str] = dict(_STOCK_ROWS)
DIVERSIFIED_UNIVERSE_TICKERS: list[str] = [t for t, _ in _STOCK_ROWS]


def sector_for_ticker(ticker: str) -> str:
    return SECTOR_BY_TICKER.get(ticker, "other")


def universe_size() -> int:
    return len(DIVERSIFIED_UNIVERSE_TICKERS)
