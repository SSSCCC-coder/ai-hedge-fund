"""
Data Collector Agent
Runs once at the start to gather raw financial data for each ticker.
Stores a summary in state["data"]["ticker_input_data"] for the Process Monitor.
"""

from datetime import datetime, timedelta
from src.graph.state import AgentState
from src.tools.api import get_financial_metrics, get_prices, get_market_cap, get_company_news, get_insider_trades
from src.utils.api_key import get_api_key_from_state
from src.utils.progress import progress


def data_collector_agent(state: AgentState, agent_id: str = "data_collector"):
    """Fetches raw data for each ticker and stores a summary for the Process Monitor."""
    data = state["data"]
    tickers = data["tickers"]
    end_date = data["end_date"]
    start_date = data.get("start_date") or (
        datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=365)
    ).strftime("%Y-%m-%d")

    api_key = get_api_key_from_state(state, "FINANCIAL_DATASETS_API_KEY")
    ticker_input_data = {}

    for ticker in tickers:
        progress.update_status(agent_id, ticker, "Collecting raw data")
        summary = {}

        # ── 1. Financial Metrics ─────────────────────────────────────────────
        try:
            metrics_list = get_financial_metrics(
                ticker=ticker, end_date=end_date, period="ttm", limit=10, api_key=api_key
            )
        except Exception:
            metrics_list = []

        summary["financial_metrics_periods"] = len(metrics_list)

        if metrics_list:
            m = metrics_list[0]
            summary["financial_metrics"] = {
                # Valuation
                "Market Cap":        _fmt_large(m.market_cap),
                "P/E Ratio":         _fmt_ratio(m.price_to_earnings_ratio),
                "P/B Ratio":         _fmt_ratio(m.price_to_book_ratio),
                "P/S Ratio":         _fmt_ratio(m.price_to_sales_ratio),
                "EV/EBITDA":         _fmt_ratio(m.enterprise_value_to_ebitda_ratio),
                "EV/Revenue":        _fmt_ratio(m.enterprise_value_to_revenue_ratio),
                "PEG Ratio":         _fmt_ratio(m.peg_ratio),
                # Profitability
                "EPS":               _fmt_num(m.earnings_per_share, prefix="$"),
                "BV/Share":          _fmt_num(m.book_value_per_share, prefix="$"),
                "FCF/Share":         _fmt_num(m.free_cash_flow_per_share, prefix="$"),
                "ROE":               _fmt_pct(m.return_on_equity),
                "ROA":               _fmt_pct(m.return_on_assets),
                "ROIC":              _fmt_pct(m.return_on_invested_capital),
                "Gross Margin":      _fmt_pct(m.gross_margin),
                "Operating Margin":  _fmt_pct(m.operating_margin),
                "Net Margin":        _fmt_pct(m.net_margin),
                "FCF Yield":         _fmt_pct(m.free_cash_flow_yield),
                # Growth
                "Revenue Growth":    _fmt_pct(m.revenue_growth),
                "Earnings Growth":   _fmt_pct(m.earnings_growth),
                "EPS Growth":        _fmt_pct(m.earnings_per_share_growth),
                "FCF Growth":        _fmt_pct(m.free_cash_flow_growth),
                "BV Growth":         _fmt_pct(m.book_value_growth),
                # Health
                "Current Ratio":     _fmt_ratio(m.current_ratio),
                "Quick Ratio":       _fmt_ratio(m.quick_ratio),
                "Debt/Equity":       _fmt_ratio(m.debt_to_equity),
                "Debt/Assets":       _fmt_ratio(m.debt_to_assets),
                "Interest Coverage": _fmt_ratio(m.interest_coverage),
            }
            # Remove N/A entries to keep it clean
            summary["financial_metrics"] = {
                k: v for k, v in summary["financial_metrics"].items() if v != "N/A"
            }

        # ── 2. Price Data ────────────────────────────────────────────────────
        try:
            prices = get_prices(
                ticker=ticker, start_date=start_date, end_date=end_date, api_key=api_key
            )
        except Exception:
            prices = []

        summary["price_periods"] = len(prices)

        if prices:
            closes = [p.close for p in prices if p.close is not None]
            highs  = [p.high  for p in prices if p.high  is not None]
            lows   = [p.low   for p in prices if p.low   is not None]
            vols   = [p.volume for p in prices if getattr(p, "volume", None) is not None]

            summary["price_data"] = {
                "Latest Close":   f"${closes[-1]:,.2f}" if closes else "N/A",
                "Period High":    f"${max(highs):,.2f}"  if highs  else "N/A",
                "Period Low":     f"${min(lows):,.2f}"   if lows   else "N/A",
                "Price Change":   _price_change(closes),
                "Avg Daily Vol":  _fmt_large(sum(vols) / len(vols)) if vols else "N/A",
                "Data Start":     prices[0].time[:10]  if prices else "N/A",
                "Data End":       prices[-1].time[:10] if prices else "N/A",
            }

        # ── 3. News ──────────────────────────────────────────────────────────
        try:
            news = get_company_news(
                ticker=ticker, end_date=end_date, start_date=start_date,
                limit=50, api_key=api_key
            )
        except Exception:
            news = []
        summary["news_count"] = len(news)

        # ── 4. Insider Trades ────────────────────────────────────────────────
        try:
            trades = get_insider_trades(
                ticker=ticker, end_date=end_date, start_date=start_date,
                limit=50, api_key=api_key
            )
        except Exception:
            trades = []
        summary["insider_trade_count"] = len(trades)

        # ── 5. Market Cap ────────────────────────────────────────────────────
        try:
            mc = get_market_cap(ticker=ticker, end_date=end_date, api_key=api_key)
        except Exception:
            mc = None
        if mc:
            summary["market_cap"] = _fmt_large(mc)

        ticker_input_data[ticker] = summary
        progress.update_status(agent_id, ticker, "Done")

    # Store in state
    state["data"]["ticker_input_data"] = ticker_input_data
    progress.update_status(agent_id, None, "Done")

    return {"data": state["data"]}


# ── Formatting helpers ─────────────────────────────────────────────────────────

def _fmt_pct(v):
    if v is None: return "N/A"
    return f"{v:.2%}"

def _fmt_ratio(v):
    if v is None: return "N/A"
    return f"{v:.2f}"

def _fmt_num(v, prefix="", suffix=""):
    if v is None: return "N/A"
    return f"{prefix}{v:.2f}{suffix}"

def _fmt_large(v):
    if v is None: return "N/A"
    try:
        v = float(v)
        if abs(v) >= 1e12: return f"${v/1e12:.2f}T"
        if abs(v) >= 1e9:  return f"${v/1e9:.2f}B"
        if abs(v) >= 1e6:  return f"${v/1e6:.2f}M"
        if abs(v) >= 1e3:  return f"${v/1e3:.2f}K"
        return f"${v:.2f}"
    except Exception:
        return "N/A"

def _price_change(closes):
    if len(closes) < 2: return "N/A"
    pct = (closes[-1] - closes[0]) / closes[0]
    arrow = "▲" if pct >= 0 else "▼"
    return f"{arrow} {abs(pct):.2%}"
