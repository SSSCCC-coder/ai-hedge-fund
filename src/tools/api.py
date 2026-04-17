"""
Data layer — yfinance is the primary (and only) data source.
All public function signatures are unchanged so the rest of the codebase is unaffected.
"""

import datetime
import logging
import math

import pandas as pd
import yfinance as yf

from src.data.cache import get_cache
from src.data.models import (
    CompanyFacts,
    CompanyFactsResponse,
    CompanyNews,
    CompanyNewsResponse,
    FinancialMetrics,
    FinancialMetricsResponse,
    InsiderTrade,
    InsiderTradeResponse,
    LineItem,
    LineItemResponse,
    Price,
    PriceResponse,
)

logger = logging.getLogger(__name__)
_cache = get_cache()

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _nan_to_none(v):
    """Convert NaN / inf to None so Pydantic doesn't choke."""
    if v is None:
        return None
    try:
        if math.isnan(v) or math.isinf(v):
            return None
    except TypeError:
        pass
    return v


def _safe(info: dict, *keys, scale: float = 1.0):
    """Pull the first non-None / non-NaN key from an info dict."""
    for k in keys:
        v = info.get(k)
        if v is not None:
            try:
                fv = float(v) * scale
                if not math.isnan(fv) and not math.isinf(fv):
                    return fv
            except (TypeError, ValueError):
                pass
    return None


def _stmt_cols_before(df: pd.DataFrame, end_date_str: str) -> pd.DataFrame:
    """Return statement columns whose date <= end_date, sorted most-recent first."""
    if df is None or df.empty:
        return pd.DataFrame()
    end_dt = pd.Timestamp(end_date_str)
    cols = sorted([c for c in df.columns if pd.Timestamp(c) <= end_dt], reverse=True)
    return df[cols] if cols else pd.DataFrame()


def _get_cell(df: pd.DataFrame, col_idx: int, *row_keys):
    """
    Safely read one cell from a statement DataFrame.
    Tries each row_key in order; returns float or None.
    """
    if df is None or df.empty or col_idx >= len(df.columns):
        return None
    col = df.columns[col_idx]
    for key in row_keys:
        if key in df.index:
            v = df.loc[key, col]
            if pd.notna(v):
                return _nan_to_none(float(v))
    return None


# ---------------------------------------------------------------------------
# Line-item → yfinance statement mapping
# ---------------------------------------------------------------------------

# Each entry: field_name → (statement, [row candidates in priority order])
# statement is one of: "income", "balance", "cashflow", "derived"
_LINE_ITEM_MAP: dict[str, tuple[str, list[str]]] = {
    # Income statement
    "revenue":                               ("income",   ["Total Revenue"]),
    "gross_profit":                          ("income",   ["Gross Profit"]),
    "operating_income":                      ("income",   ["Operating Income", "EBIT"]),
    "net_income":                            ("income",   ["Net Income"]),
    "ebit":                                  ("income",   ["EBIT", "Operating Income"]),
    "ebitda":                                ("income",   ["EBITDA", "Normalized EBITDA"]),
    "depreciation_and_amortization":         ("income",   ["Reconciled Depreciation",
                                                            "Depreciation And Amortization"]),
    "interest_expense":                      ("income",   ["Interest Expense",
                                                            "Interest Expense Non Operating"]),
    "research_and_development":              ("income",   ["Research And Development"]),
    "operating_expense":                     ("income",   ["Operating Expense", "Total Expenses"]),
    "earnings_per_share":                    ("income",   ["Basic EPS", "Diluted EPS"]),
    # Balance sheet
    "total_assets":                          ("balance",  ["Total Assets"]),
    "total_liabilities":                     ("balance",  ["Total Liabilities Net Minority Interest"]),
    "shareholders_equity":                   ("balance",  ["Stockholders Equity", "Common Stock Equity"]),
    "current_assets":                        ("balance",  ["Current Assets"]),
    "current_liabilities":                   ("balance",  ["Current Liabilities"]),
    "cash_and_equivalents":                  ("balance",  ["Cash And Cash Equivalents",
                                                            "Cash Equivalents"]),
    "total_debt":                            ("balance",  ["Total Debt"]),
    "goodwill_and_intangible_assets":        ("balance",  ["Goodwill And Other Intangible Assets",
                                                            "Goodwill"]),
    "outstanding_shares":                    ("balance",  ["Ordinary Shares Number", "Share Issued"]),
    # Cash flow
    "free_cash_flow":                        ("cashflow", ["Free Cash Flow"]),
    "capital_expenditure":                   ("cashflow", ["Capital Expenditure"]),
    "dividends_and_other_cash_distributions": ("cashflow", ["Common Stock Dividend",
                                                             "Cash Dividends Paid"]),
    "issuance_or_purchase_of_equity_shares": ("cashflow", ["Repurchase Of Capital Stock",
                                                            "Common Stock Issuance"]),
    # Derived (calculated from other items)
    "working_capital":          ("derived", []),
    "gross_margin":             ("derived", []),
    "operating_margin":         ("derived", []),
    "debt_to_equity":           ("derived", []),
    "return_on_invested_capital": ("derived", []),
    "book_value_per_share":     ("derived", []),
}


# ---------------------------------------------------------------------------
# get_prices
# ---------------------------------------------------------------------------

def get_prices(ticker: str, start_date: str, end_date: str, api_key: str = None) -> list[Price]:
    """Fetch OHLCV price data via yfinance."""
    cache_key = f"{ticker}_{start_date}_{end_date}"
    if cached := _cache.get_prices(cache_key):
        return [Price(**p) for p in cached]

    try:
        hist = yf.Ticker(ticker).history(start=start_date, end=end_date, auto_adjust=True)
        if hist.empty:
            return []

        prices = [
            Price(
                open=float(row["Open"]),
                close=float(row["Close"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                volume=int(row["Volume"]) if pd.notna(row.get("Volume")) else None,
                time=dt.strftime("%Y-%m-%d"),
            )
            for dt, row in hist.iterrows()
        ]

        _cache.set_prices(cache_key, [p.model_dump() for p in prices])
        return prices
    except Exception as e:
        logger.warning("get_prices failed for %s: %s", ticker, e)
        return []


# ---------------------------------------------------------------------------
# get_financial_metrics
# ---------------------------------------------------------------------------

def get_financial_metrics(
    ticker: str,
    end_date: str,
    period: str = "ttm",
    limit: int = 10,
    api_key: str = None,
) -> list[FinancialMetrics]:
    """
    Return FinancialMetrics for up to `limit` periods ending on or before end_date.
    period: "ttm" | "annual" | "quarterly"
    """
    cache_key = f"{ticker}_{period}_{end_date}_{limit}"
    if cached := _cache.get_financial_metrics(cache_key):
        return [FinancialMetrics(**m) for m in cached]

    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        currency = info.get("currency") or "USD"

        if period == "quarterly":
            inc = _stmt_cols_before(t.quarterly_income_stmt, end_date)
            bal = _stmt_cols_before(t.quarterly_balance_sheet, end_date)
            cf  = _stmt_cols_before(t.quarterly_cashflow, end_date)
        else:
            # Both "annual" and "ttm" use annual statements
            inc = _stmt_cols_before(t.income_stmt, end_date)
            bal = _stmt_cols_before(t.balance_sheet, end_date)
            cf  = _stmt_cols_before(t.cashflow, end_date)

        n_periods = min(limit, max(len(inc.columns), 1)) if not inc.empty else min(limit, 1)

        results: list[FinancialMetrics] = []
        for i in range(n_periods):
            # Report period date
            if not inc.empty and i < len(inc.columns):
                report_period_str = inc.columns[i].strftime("%Y-%m-%d")
            else:
                report_period_str = end_date

            # Short helpers bound to column index i
            def gi(*keys): return _get_cell(inc, i, *keys)
            def gb(*keys): return _get_cell(bal, i, *keys)
            def gc(*keys): return _get_cell(cf,  i, *keys)

            # --- Income statement ---
            revenue        = gi("Total Revenue")
            gross_profit   = gi("Gross Profit")
            op_income      = gi("Operating Income", "EBIT")
            net_income     = gi("Net Income")
            ebit           = gi("EBIT", "Operating Income")
            interest_exp   = gi("Interest Expense", "Interest Expense Non Operating")
            da             = gi("Reconciled Depreciation", "Depreciation And Amortization")
            ebitda_raw     = gi("EBITDA", "Normalized EBITDA")
            ebitda         = ebitda_raw if ebitda_raw is not None else (
                                (ebit or 0) + (da or 0) if ebit is not None else None)

            # --- Balance sheet ---
            total_assets   = gb("Total Assets")
            total_liab     = gb("Total Liabilities Net Minority Interest")
            equity         = gb("Stockholders Equity", "Common Stock Equity")
            cur_assets     = gb("Current Assets")
            cur_liab       = gb("Current Liabilities")
            cash           = gb("Cash And Cash Equivalents", "Cash Equivalents")
            total_debt     = gb("Total Debt")
            inventory      = gb("Inventory")
            receivables    = gb("Net Receivables", "Accounts Receivable")
            shares         = gb("Ordinary Shares Number", "Share Issued")

            # --- Cash flow ---
            fcf            = gc("Free Cash Flow")
            ocf            = gc("Operating Cash Flow", "Cash From Operations")
            cogs           = gi("Cost Of Revenue", "Cost of Goods Sold")

            # --- Derived ratios ---
            def _div(a, b):
                return _nan_to_none(a / b) if a is not None and b else None

            gross_margin   = _div(gross_profit, revenue)
            op_margin      = _div(op_income,    revenue)
            net_margin     = _div(net_income,   revenue)
            roe            = _div(net_income,   equity)
            roa            = _div(net_income,   total_assets)
            asset_turn     = _div(revenue,      total_assets)
            inv_turn       = _div(cogs,         inventory)
            rec_turn       = _div(revenue,      receivables)
            dso            = _nan_to_none(365.0 / rec_turn) if rec_turn else None
            wc             = (cur_assets - cur_liab) if cur_assets and cur_liab else None
            wc_turn        = _div(revenue, wc)
            cur_ratio      = _div(cur_assets,   cur_liab)
            quick_ratio    = _div((cur_assets - (inventory or 0)), cur_liab) if cur_assets and cur_liab else None
            cash_ratio     = _div(cash,         cur_liab)
            ocf_ratio      = _div(ocf,          cur_liab)
            d_to_e         = _div(total_debt,   equity)
            d_to_a         = _div(total_debt,   total_assets)
            int_cov        = _nan_to_none(ebit / abs(interest_exp)) if ebit and interest_exp else None
            invested_cap   = (equity or 0) + (total_debt or 0)
            tax_rate       = float(info.get("effectiveTaxRate") or 0.21)
            nopat          = ebit * (1 - tax_rate) if ebit else None
            roic           = _div(nopat, invested_cap)

            # --- Market / valuation data (best-effort from .info for latest period) ---
            if i == 0:
                market_cap  = _safe(info, "marketCap")
                ev          = _safe(info, "enterpriseValue")
                pe          = _safe(info, "trailingPE")
                pb          = _safe(info, "priceToBook")
                ps          = _safe(info, "priceToSalesTrailing12Months")
                ev_ebitda   = _safe(info, "enterpriseToEbitda")
                ev_rev      = _safe(info, "enterpriseToRevenue")
                peg         = _safe(info, "pegRatio")
                eps         = _safe(info, "trailingEps")
                bvps        = _safe(info, "bookValue")
                payout      = _safe(info, "payoutRatio")
                rev_growth  = _safe(info, "revenueGrowth")
                earn_growth = _safe(info, "earningsGrowth")
            else:
                market_cap  = None
                ev = pe = pb = ps = ev_ebitda = ev_rev = peg = None
                payout = rev_growth = earn_growth = None
                eps         = gi("Basic EPS", "Diluted EPS")
                bvps        = _div(equity, shares)

            fcf_yield  = _div(fcf, market_cap)
            fcf_ps     = _div(fcf, shares)
            bvps_final = bvps if bvps is not None else _div(equity, shares)

            results.append(FinancialMetrics(
                ticker=ticker,
                report_period=report_period_str,
                period=period,
                currency=currency,
                market_cap=market_cap,
                enterprise_value=ev,
                price_to_earnings_ratio=pe,
                price_to_book_ratio=pb,
                price_to_sales_ratio=ps,
                enterprise_value_to_ebitda_ratio=ev_ebitda,
                enterprise_value_to_revenue_ratio=ev_rev,
                free_cash_flow_yield=fcf_yield,
                peg_ratio=peg,
                gross_margin=gross_margin,
                operating_margin=op_margin,
                net_margin=net_margin,
                return_on_equity=roe,
                return_on_assets=roa,
                return_on_invested_capital=roic,
                asset_turnover=asset_turn,
                inventory_turnover=inv_turn,
                receivables_turnover=rec_turn,
                days_sales_outstanding=dso,
                operating_cycle=None,
                working_capital_turnover=wc_turn,
                current_ratio=cur_ratio,
                quick_ratio=quick_ratio,
                cash_ratio=cash_ratio,
                operating_cash_flow_ratio=ocf_ratio,
                debt_to_equity=d_to_e,
                debt_to_assets=d_to_a,
                interest_coverage=int_cov,
                revenue_growth=rev_growth,
                earnings_growth=earn_growth,
                book_value_growth=None,
                earnings_per_share_growth=None,
                free_cash_flow_growth=None,
                operating_income_growth=None,
                ebitda_growth=None,
                payout_ratio=payout,
                earnings_per_share=eps,
                book_value_per_share=bvps_final,
                free_cash_flow_per_share=fcf_ps,
            ))

        _cache.set_financial_metrics(cache_key, [m.model_dump() for m in results])
        return results
    except Exception as e:
        logger.warning("get_financial_metrics failed for %s: %s", ticker, e)
        return []


# ---------------------------------------------------------------------------
# search_line_items
# ---------------------------------------------------------------------------

def search_line_items(
    ticker: str,
    line_items: list[str],
    end_date: str,
    period: str = "ttm",
    limit: int = 10,
    api_key: str = None,
) -> list[LineItem]:
    """
    Return up to `limit` LineItem records (one per period) containing the
    requested financial fields.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        currency = info.get("currency") or "USD"

        # Choose statements
        if period == "quarterly":
            inc = _stmt_cols_before(t.quarterly_income_stmt, end_date)
            bal = _stmt_cols_before(t.quarterly_balance_sheet, end_date)
            cf  = _stmt_cols_before(t.quarterly_cashflow, end_date)
        elif period == "ttm":
            # Use last 4 quarters summed for flow items; latest quarter for stocks
            inc_q = _stmt_cols_before(t.quarterly_income_stmt, end_date)
            bal_q = _stmt_cols_before(t.quarterly_balance_sheet, end_date)
            cf_q  = _stmt_cols_before(t.quarterly_cashflow, end_date)
            # We'll build one synthetic TTM period
            inc = inc_q
            bal = bal_q
            cf  = cf_q
        else:  # annual
            inc = _stmt_cols_before(t.income_stmt, end_date)
            bal = _stmt_cols_before(t.balance_sheet, end_date)
            cf  = _stmt_cols_before(t.cashflow, end_date)

        # Number of periods to return
        ref_df = inc if not inc.empty else (bal if not bal.empty else cf)
        if period == "ttm":
            n_periods = 1
        else:
            n_periods = min(limit, len(ref_df.columns) if not ref_df.empty else 0)

        results: list[LineItem] = []
        for i in range(n_periods):
            # Date label for this period
            if not ref_df.empty and i < len(ref_df.columns):
                report_date = ref_df.columns[i].strftime("%Y-%m-%d")
            else:
                report_date = end_date

            fields: dict = {}

            for field in line_items:
                mapping = _LINE_ITEM_MAP.get(field)
                if mapping is None:
                    # Unknown field – skip
                    continue

                stmt_type, row_keys = mapping

                if stmt_type == "income":
                    if period == "ttm" and not inc.empty:
                        # Sum last 4 quarters for flow items
                        n_q = min(4, len(inc.columns))
                        total = None
                        for qi in range(n_q):
                            v = _get_cell(inc, qi, *row_keys)
                            if v is not None:
                                total = (total or 0) + v
                        fields[field] = total
                    else:
                        fields[field] = _get_cell(inc, i, *row_keys)

                elif stmt_type == "balance":
                    # Balance sheet: use the most-recent quarter/annual (index 0 always)
                    if period == "ttm":
                        fields[field] = _get_cell(bal, 0, *row_keys)
                    else:
                        fields[field] = _get_cell(bal, i, *row_keys)

                elif stmt_type == "cashflow":
                    if period == "ttm" and not cf.empty:
                        n_q = min(4, len(cf.columns))
                        total = None
                        for qi in range(n_q):
                            v = _get_cell(cf, qi, *row_keys)
                            if v is not None:
                                total = (total or 0) + v
                        fields[field] = total
                    else:
                        fields[field] = _get_cell(cf, i, *row_keys)

                elif stmt_type == "derived":
                    # Derived fields — calculate from already-fetched data
                    def _g_inc(*keys): return _get_cell(inc, 0 if period == "ttm" else i, *keys)
                    def _g_bal(*keys): return _get_cell(bal, 0 if period == "ttm" else i, *keys)
                    def _g_cf(*keys):  return _get_cell(cf,  0 if period == "ttm" else i, *keys)

                    if field == "working_capital":
                        ca = _g_bal("Current Assets")
                        cl = _g_bal("Current Liabilities")
                        fields[field] = (ca - cl) if ca is not None and cl is not None else None

                    elif field == "gross_margin":
                        rev = _g_inc("Total Revenue")
                        gp  = _g_inc("Gross Profit")
                        fields[field] = _nan_to_none(gp / rev) if gp and rev else None

                    elif field == "operating_margin":
                        rev = _g_inc("Total Revenue")
                        oi  = _g_inc("Operating Income", "EBIT")
                        fields[field] = _nan_to_none(oi / rev) if oi and rev else None

                    elif field == "debt_to_equity":
                        td  = _g_bal("Total Debt")
                        eq  = _g_bal("Stockholders Equity", "Common Stock Equity")
                        fields[field] = _nan_to_none(td / eq) if td and eq else None

                    elif field == "return_on_invested_capital":
                        ebit = _g_inc("EBIT", "Operating Income")
                        eq   = _g_bal("Stockholders Equity", "Common Stock Equity")
                        td   = _g_bal("Total Debt")
                        if ebit is not None and ((eq or 0) + (td or 0)) != 0:
                            tax = float(info.get("effectiveTaxRate") or 0.21)
                            nopat = ebit * (1 - tax)
                            fields[field] = _nan_to_none(nopat / ((eq or 0) + (td or 0)))
                        else:
                            fields[field] = None

                    elif field == "book_value_per_share":
                        eq     = _g_bal("Stockholders Equity", "Common Stock Equity")
                        shares = _g_bal("Ordinary Shares Number", "Share Issued")
                        fields[field] = _nan_to_none(eq / shares) if eq and shares else None

            results.append(LineItem(
                ticker=ticker,
                report_period=report_date,
                period=period,
                currency=currency,
                **fields,
            ))

        return results[:limit]
    except Exception as e:
        logger.warning("search_line_items failed for %s: %s", ticker, e)
        return []


# ---------------------------------------------------------------------------
# get_insider_trades
# ---------------------------------------------------------------------------

def get_insider_trades(
    ticker: str,
    end_date: str,
    start_date: str | None = None,
    limit: int = 1000,
    api_key: str = None,
) -> list[InsiderTrade]:
    """Fetch insider transactions via yfinance."""
    cache_key = f"{ticker}_{start_date or 'none'}_{end_date}_{limit}"
    if cached := _cache.get_insider_trades(cache_key):
        return [InsiderTrade(**t) for t in cached]

    try:
        t = yf.Ticker(ticker)
        # yfinance ≥0.2 exposes insider_transactions as a DataFrame
        df = getattr(t, "insider_transactions", None)
        if df is None or (isinstance(df, pd.DataFrame) and df.empty):
            return []

        trades: list[InsiderTrade] = []
        for _, row in df.iterrows():
            # Normalise column names across yfinance versions
            date_val = row.get("Start Date") or row.get("Date") or row.get("startDate")
            if date_val is None:
                continue
            try:
                date_str = pd.Timestamp(date_val).strftime("%Y-%m-%d")
            except Exception:
                date_str = str(date_val)[:10]

            # Date filtering
            if date_str > end_date:
                continue
            if start_date and date_str < start_date:
                continue

            shares_raw = row.get("Shares") or row.get("shares") or 0
            value_raw  = row.get("Value") or row.get("value") or 0
            try:
                shares_val = float(shares_raw) if shares_raw else None
                value_val  = float(str(value_raw).replace(",", "")) if value_raw else None
            except (TypeError, ValueError):
                shares_val = value_val = None

            tx = row.get("Transaction") or row.get("transaction") or ""

            trades.append(InsiderTrade(
                ticker=ticker,
                issuer=None,
                name=str(row.get("Insider") or row.get("insider") or ""),
                title=str(row.get("Position") or row.get("position") or ""),
                is_board_director=None,
                transaction_date=date_str,
                transaction_shares=shares_val,
                transaction_price_per_share=None,
                transaction_value=value_val,
                shares_owned_before_transaction=None,
                shares_owned_after_transaction=None,
                security_title=None,
                filing_date=date_str,
            ))

        trades = trades[:limit]
        if trades:
            _cache.set_insider_trades(cache_key, [t.model_dump() for t in trades])
        return trades
    except Exception as e:
        logger.warning("get_insider_trades failed for %s: %s", ticker, e)
        return []


# ---------------------------------------------------------------------------
# get_company_news
# ---------------------------------------------------------------------------

def get_company_news(
    ticker: str,
    end_date: str,
    start_date: str | None = None,
    limit: int = 1000,
    api_key: str = None,
) -> list[CompanyNews]:
    """Fetch recent news articles via yfinance."""
    cache_key = f"{ticker}_{start_date or 'none'}_{end_date}_{limit}"
    if cached := _cache.get_company_news(cache_key):
        return [CompanyNews(**n) for n in cached]

    try:
        t = yf.Ticker(ticker)
        raw_news = t.news or []

        news_items: list[CompanyNews] = []
        for item in raw_news:
            # Timestamp is Unix epoch
            ts = item.get("providerPublishTime") or item.get("publishedAt")
            if ts:
                try:
                    date_str = datetime.datetime.fromtimestamp(int(ts), tz=datetime.timezone.utc).strftime("%Y-%m-%d")
                except Exception:
                    date_str = end_date
            else:
                date_str = end_date

            # Date filter
            if date_str > end_date:
                continue
            if start_date and date_str < start_date:
                continue

            title   = item.get("title") or ""
            url     = item.get("link") or item.get("url") or ""
            source  = item.get("publisher") or item.get("source") or "Yahoo Finance"

            news_items.append(CompanyNews(
                ticker=ticker,
                title=title,
                author=None,
                source=source,
                date=date_str,
                url=url,
                sentiment=None,
            ))

        news_items = news_items[:limit]
        if news_items:
            _cache.set_company_news(cache_key, [n.model_dump() for n in news_items])
        return news_items
    except Exception as e:
        logger.warning("get_company_news failed for %s: %s", ticker, e)
        return []


# ---------------------------------------------------------------------------
# get_market_cap
# ---------------------------------------------------------------------------

def get_market_cap(
    ticker: str,
    end_date: str,
    api_key: str = None,
) -> float | None:
    """Return market cap from yfinance info (current) or financial metrics (historical)."""
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        mc = _safe(info, "marketCap")
        if mc:
            return mc
    except Exception as e:
        logger.warning("get_market_cap (info) failed for %s: %s", ticker, e)

    # Fallback: derive from financial metrics
    metrics = get_financial_metrics(ticker, end_date, api_key=api_key)
    if metrics:
        return metrics[0].market_cap
    return None


# ---------------------------------------------------------------------------
# DataFrame utilities (unchanged API)
# ---------------------------------------------------------------------------

def prices_to_df(prices: list[Price]) -> pd.DataFrame:
    """Convert a list of Price objects to a DataFrame indexed by date."""
    df = pd.DataFrame([p.model_dump() for p in prices])
    df["Date"] = pd.to_datetime(df["time"])
    df.set_index("Date", inplace=True)
    for col in ["open", "close", "high", "low", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df.sort_index(inplace=True)
    return df


def get_price_data(ticker: str, start_date: str, end_date: str, api_key: str = None) -> pd.DataFrame:
    """Convenience wrapper: prices → DataFrame."""
    return prices_to_df(get_prices(ticker, start_date, end_date, api_key=api_key))
