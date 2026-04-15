"""
Upstream analyst context injection for downstream LLM agents.

When agents are chained in the flow (A → B), by the time B runs A's signal
is already in state["data"]["analyst_signals"].  This module formats that
data into a human-readable context block so B's LLM can use it as input.

Two tiers of formatting:
  • Functional analysts (fundamentals / technicals / valuation / growth /
    sentiment / news_sentiment) — rich structured output with all computed
    metrics, values, and pass/fail flags.
  • Master agents (Buffett, Graham, etc.) — concise signal + confidence +
    brief reasoning summary.
"""

import re
from typing import Any


# ── Identity helpers ───────────────────────────────────────────────────────

def _base_key(agent_id: str) -> str:
    """'warren_buffett_agent_abc123' → 'warren_buffett'"""
    name = re.sub(r"_[a-zA-Z0-9]{5,}$", "", agent_id)
    if name.endswith("_agent"):
        name = name[:-6]
    return name


_SKIP = ("risk_management", "portfolio_manager", "portfolio_management", "data_collector")

_FUNCTIONAL = {
    "fundamentals_analyst",
    "technical_analyst",
    "valuation_analyst",
    "growth_analyst",
    "sentiment_analyst",
    "news_sentiment_analyst",
}

_DISPLAY = {
    # Functional
    "fundamentals_analyst":   "Fundamentals Analyst",
    "technical_analyst":      "Technical Analyst",
    "valuation_analyst":      "Valuation Analyst",
    "growth_analyst":         "Growth Analyst",
    "sentiment_analyst":      "Sentiment Analyst",
    "news_sentiment_analyst": "News Sentiment Analyst",
    # Masters
    "ben_graham":             "Ben Graham",
    "warren_buffett":         "Warren Buffett",
    "charlie_munger":         "Charlie Munger",
    "mohnish_pabrai":         "Mohnish Pabrai",
    "phil_fisher":            "Phil Fisher",
    "peter_lynch":            "Peter Lynch",
    "cathie_wood":            "Cathie Wood",
    "rakesh_jhunjhunwala":    "Rakesh Jhunjhunwala",
    "michael_burry":          "Michael Burry",
    "bill_ackman":            "Bill Ackman",
    "stanley_druckenmiller":  "Stanley Druckenmiller",
    "nassim_taleb":           "Nassim Taleb",
    "aswath_damodaran":       "Aswath Damodaran",
}


# ── Signal label helpers ───────────────────────────────────────────────────

def _sig_label(signal: str) -> str:
    s = (signal or "neutral").upper()
    return {"BULLISH": "▲ BULLISH", "BEARISH": "▼ BEARISH"}.get(s, "── NEUTRAL")


def _passed(flag: Any) -> str:
    if flag is True:  return "✓"
    if flag is False: return "✗"
    return "?"


# ── Per-agent rich formatters ──────────────────────────────────────────────

def _fmt_fundamentals(sig: dict, ticker: str) -> str:
    lines = []
    r = sig.get("reasoning", {})
    md = sig.get("metrics_detail", {})

    def _row(group: str) -> list[str]:
        items = md.get(group, [])
        out = []
        for m in items:
            v = m.get("value") or "N/A"
            t = m.get("threshold", "")
            p = _passed(m.get("passed"))
            out.append(f"{m['name']}: {v} (threshold {t}) {p}")
        return out

    for group in ("Profitability", "Growth", "Financial Health", "Valuation Ratios"):
        rows = _row(group)
        if rows:
            lines.append(f"  {group}:")
            for row in rows:
                lines.append(f"    {row}")

    return "\n".join(lines)


def _fmt_technicals(sig: dict, ticker: str) -> str:
    lines = []
    r = sig.get("reasoning", {})
    md = sig.get("metrics_detail", {})
    strategies = md.get("Strategy Signals (weight)", [])

    if strategies:
        lines.append("  Strategy signals:")
        for m in strategies:
            v = m.get("value") or "N/A"
            p = _passed(m.get("passed"))
            lines.append(f"    {m['name']}: {v} {p}")

    # Sub-strategy detail
    for key, label in [
        ("trend_following",       "Trend"),
        ("mean_reversion",        "Mean Reversion"),
        ("momentum",              "Momentum"),
        ("volatility",            "Volatility"),
        ("statistical_arbitrage", "Stat Arb"),
    ]:
        sub = r.get(key, {})
        if sub:
            conf = sub.get("confidence", "")
            conf_str = f" ({conf}% conf)" if conf else ""
            lines.append(f"  {label}: {sub.get('signal', 'N/A')}{conf_str}")

    return "\n".join(lines)


def _fmt_valuation(sig: dict, ticker: str) -> str:
    lines = []
    md = sig.get("metrics_detail", {})
    r  = sig.get("reasoning", {})
    m  = sig.get("metrics", {})

    # Valuation method results
    methods = md.get("Valuation Methods", [])
    if methods:
        lines.append("  Valuation methods:")
        for item in methods:
            v = item.get("value") or "N/A"
            p = _passed(item.get("passed"))
            lines.append(f"    {item['name']}: {v} {p}")

    # Key inputs
    inputs = md.get("Key Inputs", [])
    if inputs:
        lines.append("  Key inputs:")
        for item in inputs:
            v = item.get("value") or "N/A"
            lines.append(f"    {item['name']}: {v}")

    # Scenario analysis
    scenario = r.get("dcf_scenario_analysis", {})
    if scenario:
        bear  = scenario.get("bear_case", "N/A")
        base  = scenario.get("base_case", "N/A")
        bull  = scenario.get("bull_case", "N/A")
        lines.append(f"  DCF scenarios — Bear: {bear} | Base: {base} | Bull: {bull}")

    return "\n".join(lines)


def _fmt_growth(sig: dict, ticker: str) -> str:
    lines = []
    r = sig.get("reasoning", {})
    m = sig.get("metrics", {})

    hist = r.get("historical_growth", {})
    if hist:
        rev = hist.get("revenue_growth")
        eps = hist.get("eps_growth")
        fcf = hist.get("fcf_growth")
        parts = []
        if rev is not None: parts.append(f"Revenue growth: {rev:.1%}")
        if eps is not None: parts.append(f"EPS growth: {eps:.1%}")
        if fcf is not None: parts.append(f"FCF growth: {fcf:.1%}")
        if parts: lines.append("  Historical growth:  " + " | ".join(parts))

    gval = r.get("growth_valuation", {})
    if gval:
        peg = gval.get("peg_ratio")
        ps  = gval.get("price_to_sales_ratio")
        parts = []
        if peg is not None: parts.append(f"PEG: {peg:.2f}")
        if ps  is not None: parts.append(f"P/S: {ps:.2f}")
        if parts: lines.append("  Growth valuation:   " + " | ".join(parts))

    margins = r.get("margin_expansion", {})
    if margins:
        gm = margins.get("gross_margin")
        om = margins.get("operating_margin")
        nm = margins.get("net_margin")
        parts = []
        if gm is not None: parts.append(f"Gross margin: {gm:.1%}")
        if om is not None: parts.append(f"Op margin: {om:.1%}")
        if nm is not None: parts.append(f"Net margin: {nm:.1%}")
        if parts: lines.append("  Margins:            " + " | ".join(parts))

    insider = r.get("insider_conviction", {})
    if insider:
        buys  = int(insider.get("buys",  0))
        sells = int(insider.get("sells", 0))
        lines.append(f"  Insider conviction: {buys} buys vs {sells} sells")

    health = r.get("financial_health", {})
    if health:
        de = health.get("debt_to_equity")
        cr = health.get("current_ratio")
        parts = []
        if de is not None: parts.append(f"D/E: {de:.2f}")
        if cr is not None: parts.append(f"Current ratio: {cr:.2f}")
        if parts: lines.append("  Financial health:   " + " | ".join(parts))

    ws = m.get("weighted_score")
    if ws: lines.append(f"  Weighted score:     {ws}")

    return "\n".join(lines)


def _fmt_sentiment(sig: dict, ticker: str) -> str:
    lines = []
    r = sig.get("reasoning", {})

    insider = r.get("insider_trading", {})
    if insider:
        im = insider.get("metrics", {})
        lines.append(
            f"  Insider trades: {im.get('total_trades', 0)} total "
            f"({im.get('bullish_trades', 0)} bullish, "
            f"{im.get('bearish_trades', 0)} bearish)"
        )

    news = r.get("news_sentiment", {})
    if news:
        nm = news.get("metrics", {})
        lines.append(
            f"  News articles:  {nm.get('total_articles', 0)} total "
            f"({nm.get('bullish_articles', 0)} bullish, "
            f"{nm.get('bearish_articles', 0)} bearish, "
            f"{nm.get('neutral_articles', 0)} neutral)"
        )

    return "\n".join(lines)


def _fmt_news_sentiment(sig: dict, ticker: str) -> str:
    r = sig.get("reasoning", {})
    ns = r.get("news_sentiment", {})
    m  = ns.get("metrics", {})
    if not m:
        return ""
    return (
        f"  News articles: {m.get('total_articles', 0)} total "
        f"({m.get('bullish_articles', 0)} bullish, "
        f"{m.get('bearish_articles', 0)} bearish, "
        f"{m.get('neutral_articles', 0)} neutral, "
        f"{m.get('articles_classified_by_llm', 0)} LLM-classified)"
    )


_FUNCTIONAL_FORMATTERS = {
    "fundamentals_analyst":   _fmt_fundamentals,
    "technical_analyst":      _fmt_technicals,
    "valuation_analyst":      _fmt_valuation,
    "growth_analyst":         _fmt_growth,
    "sentiment_analyst":      _fmt_sentiment,
    "news_sentiment_analyst": _fmt_news_sentiment,
}


# ── Master-agent short formatter ───────────────────────────────────────────

def _fmt_master(sig: dict, ticker: str, max_chars: int = 350) -> str:
    reasoning = sig.get("reasoning", "")
    if isinstance(reasoning, dict):
        parts = []
        for k, v in reasoning.items():
            if isinstance(v, dict):
                d = v.get("details", v.get("signal", ""))
                if d:
                    parts.append(f"{k}: {d}")
            else:
                parts.append(f"{k}: {v}")
        reasoning = " | ".join(parts)
    text = str(reasoning)
    if len(text) > max_chars:
        text = text[:max_chars] + "…"
    return f"  {text}" if text else ""


# ── Public API ─────────────────────────────────────────────────────────────

def get_prior_signals_context(
    analyst_signals: dict,
    current_agent_id: str,
    ticker: str,
) -> str:
    """
    Build a formatted context block of every upstream agent's results for
    *ticker*, ready to append to an LLM prompt.

    Functional analysts (fundamentals / technicals / valuation / growth /
    sentiment) receive rich formatting that exposes all computed metrics.
    Master agents (Buffett, Graham, etc.) receive a concise summary.

    Returns an empty string when no prior signals exist (first agent to run).
    """
    current_base = _base_key(current_agent_id)

    functional_blocks: list[str] = []
    master_blocks:     list[str] = []

    for agent_id, signals in analyst_signals.items():
        if any(p in agent_id for p in _SKIP):
            continue
        base = _base_key(agent_id)
        if base == current_base or agent_id == current_agent_id:
            continue
        if not isinstance(signals, dict) or ticker not in signals:
            continue

        sig_data   = signals[ticker]
        signal     = sig_data.get("signal", "neutral")
        confidence = sig_data.get("confidence", 0)
        display    = _DISPLAY.get(base, base.replace("_", " ").title())
        header     = f"  {display}: {_sig_label(signal)}  ({confidence:.0f}% confidence)"

        if base in _FUNCTIONAL:
            fmt_fn   = _FUNCTIONAL_FORMATTERS.get(base)
            detail   = fmt_fn(sig_data, ticker) if fmt_fn else ""
            block    = header + ("\n" + detail if detail else "")
            functional_blocks.append(block)
        else:
            detail = _fmt_master(sig_data, ticker)
            block  = header + ("\n" + detail if detail else "")
            master_blocks.append(block)

    if not functional_blocks and not master_blocks:
        return ""

    lines = [
        "",
        "╔══════════════════════════════════════════════════════════════════╗",
        "║  UPSTREAM ANALYST INPUT  ─────────────────────────────────────  ║",
        "╚══════════════════════════════════════════════════════════════════╝",
        "Use the data below as factual inputs for your analysis.",
        "You may agree, add nuance, or respectfully disagree based on your",
        "own investment principles.",
        "",
    ]

    if functional_blocks:
        lines.append("── Quantitative Analysis ──────────────────────────────────────────")
        for block in functional_blocks:
            lines.append(block)
        lines.append("")

    if master_blocks:
        lines.append("── Peer Investor Perspectives ─────────────────────────────────────")
        for block in master_blocks:
            lines.append(block)
        lines.append("")

    lines.append("═══════════════════════════════════════════════════════════════════")
    lines.append("")

    return "\n".join(lines)
