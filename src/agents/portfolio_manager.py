import json
import re
import time
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate

from src.graph.state import AgentState, show_agent_reasoning
from pydantic import BaseModel, Field
from typing_extensions import Literal
from src.utils.progress import progress
from src.utils.llm import call_llm


# ── Committee membership ───────────────────────────────────────────────────
# Maps base agent key → committee role
COMMITTEE_MAP: dict[str, str] = {
    # Value Committee
    "ben_graham":            "value",
    "warren_buffett":        "value",
    "charlie_munger":        "value",
    "mohnish_pabrai":        "value",
    # Growth Committee
    "phil_fisher":           "growth",
    "peter_lynch":           "growth",
    "cathie_wood":           "growth",
    "rakesh_jhunjhunwala":   "growth",
    # Contrarian / Macro Committee
    "michael_burry":         "contrarian_macro",
    "bill_ackman":           "contrarian_macro",
    "stanley_druckenmiller": "contrarian_macro",
    # Special roles
    "nassim_taleb":          "risk_gate",
    "aswath_damodaran":      "valuation_anchor",
    # Functional analysts (context only, not committee voting)
    "technical_analyst":     "functional",
    "fundamentals_analyst":  "functional",
    "growth_analyst":        "functional",
    "sentiment_analyst":     "functional",
    "news_sentiment_analyst":"functional",
    "valuation_analyst":     "functional",
}

# Committee weights per stock type
COMMITTEE_WEIGHTS: dict[str, dict[str, float]] = {
    "value":    {"value": 0.50, "growth": 0.20, "contrarian_macro": 0.30},
    "growth":   {"value": 0.20, "growth": 0.50, "contrarian_macro": 0.30},
    "macro":    {"value": 0.25, "growth": 0.25, "contrarian_macro": 0.50},
    "balanced": {"value": 0.33, "growth": 0.34, "contrarian_macro": 0.33},
}


# ── Pydantic models ────────────────────────────────────────────────────────
class PortfolioDecision(BaseModel):
    action: Literal["buy", "sell", "short", "cover", "hold"]
    quantity: int = Field(description="Number of shares to trade")
    confidence: int = Field(description="Confidence 0-100")
    reasoning: str = Field(
        description="Concise reasoning citing which committee(s) drove the decision (max 150 chars)"
    )


class PortfolioManagerOutput(BaseModel):
    decisions: dict[str, PortfolioDecision] = Field(
        description="Dictionary of ticker to trading decisions"
    )


# ── Committee analysis helpers ─────────────────────────────────────────────
def _get_base_key(agent_id: str) -> str:
    """'warren_buffett_agent_abc123' → 'warren_buffett'"""
    name = agent_id
    # Strip trailing random suffix (_XXXXX where X is alphanumeric, 5+ chars)
    name = re.sub(r"_[a-zA-Z0-9]{5,}$", "", name)
    # Strip _agent suffix
    if name.endswith("_agent"):
        name = name[:-6]
    return name


def _signal_score(signal: str, confidence: float) -> float:
    """Convert signal + confidence to a score in [-1, +1]."""
    s = (signal or "neutral").lower()
    val = 1.0 if s == "bullish" else (-1.0 if s == "bearish" else 0.0)
    return val * (confidence / 100.0)


def build_committee_analysis(ticker: str, all_signals: dict) -> dict:
    """
    Build a deterministic committee analysis for one ticker.
    Returns a JSON-serialisable dict.
    """
    # Bucket agents by committee
    buckets: dict[str, list[dict]] = {
        "value": [], "growth": [], "contrarian_macro": [],
        "risk_gate": [], "valuation_anchor": [], "functional": [],
    }

    for agent_id, signals in all_signals.items():
        if not isinstance(signals, dict):
            continue
        if agent_id.startswith("risk_management_agent"):
            continue
        if ticker not in signals:
            continue

        base = _get_base_key(agent_id)
        role = COMMITTEE_MAP.get(base)
        if role is None:
            continue

        sig_data = signals[ticker]
        signal = (sig_data.get("signal") or "neutral").lower()
        confidence = float(sig_data.get("confidence") or 50)

        buckets[role].append({
            "name": base,
            "signal": signal,
            "confidence": confidence,
            "score": _signal_score(signal, confidence),
        })

    # ── Taleb risk gate ──────────────────────────────────────────────────
    taleb_list = buckets["risk_gate"]
    if taleb_list:
        t = taleb_list[0]
        if t["signal"] == "bearish" and t["confidence"] >= 60:
            taleb_gate, taleb_factor = "danger", 0.3
        elif t["signal"] == "bearish" or t["confidence"] >= 40:
            taleb_gate, taleb_factor = "caution", 0.7
        else:
            taleb_gate, taleb_factor = "clear", 1.0
    else:
        taleb_gate, taleb_factor = "clear", 1.0

    # ── Damodaran valuation anchor ───────────────────────────────────────
    dam_list = buckets["valuation_anchor"]
    val_fn   = [a for a in buckets["functional"] if a["name"] == "valuation_analyst"]
    if dam_list:
        dam_signal = dam_list[0]["signal"]
    elif val_fn:
        dam_signal = val_fn[0]["signal"]
    else:
        dam_signal = "neutral"

    if dam_signal == "bullish":
        dam_anchor, dam_adj = "undervalued", 1.3
    elif dam_signal == "bearish":
        dam_anchor, dam_adj = "overvalued", 0.6
    else:
        dam_anchor, dam_adj = "fair", 1.0

    # ── Stock type classification ────────────────────────────────────────
    def _avg_score(lst):
        return sum(a["score"] for a in lst) / len(lst) if lst else 0.0

    growth_fn_score    = _avg_score([a for a in buckets["functional"] if a["name"] == "growth_analyst"])
    value_master_score = _avg_score(buckets["value"])
    growth_master_score= _avg_score(buckets["growth"])
    macro_intensity    = (sum(abs(a["score"]) for a in buckets["contrarian_macro"])
                          / max(len(buckets["contrarian_macro"]), 1))

    if macro_intensity > 0.45 and macro_intensity > max(abs(value_master_score), abs(growth_master_score)):
        stock_type = "macro"
    elif growth_fn_score > 0.3 or (buckets["growth"] and growth_master_score > value_master_score):
        stock_type = "growth"
    elif dam_anchor == "undervalued" or (buckets["value"] and value_master_score > growth_master_score):
        stock_type = "value"
    else:
        stock_type = "balanced"

    weights = COMMITTEE_WEIGHTS[stock_type]

    # ── Committee summaries ──────────────────────────────────────────────
    def _committee_dict(agents: list[dict], weight: float) -> dict:
        score   = _avg_score(agents)
        bullish = sum(1 for a in agents if a["signal"] == "bullish")
        bearish = sum(1 for a in agents if a["signal"] == "bearish")
        neutral = len(agents) - bullish - bearish
        return {
            "agents":  [{"name": a["name"], "signal": a["signal"], "confidence": round(a["confidence"], 1)} for a in agents],
            "score":   round(score, 3),
            "weight":  weight,
            "bullish": bullish,
            "bearish": bearish,
            "neutral": neutral,
        }

    value_comm = _committee_dict(buckets["value"],            weights["value"])
    growth_comm= _committee_dict(buckets["growth"],           weights["growth"])
    macro_comm = _committee_dict(buckets["contrarian_macro"], weights["contrarian_macro"])

    weighted_score = (
        value_comm["score"]  * value_comm["weight"] +
        growth_comm["score"] * growth_comm["weight"] +
        macro_comm["score"]  * macro_comm["weight"]
    )

    # Dominant = committee with highest |score × weight|
    contributions = {
        "value":            abs(value_comm["score"])  * value_comm["weight"],
        "growth":           abs(growth_comm["score"]) * growth_comm["weight"],
        "contrarian_macro": abs(macro_comm["score"])  * macro_comm["weight"],
    }
    dominant = max(contributions, key=contributions.get)

    # Functional context signals
    tech_list  = [a for a in buckets["functional"] if a["name"] == "technical_analyst"]
    sent_list  = [a for a in buckets["functional"] if a["name"] in ("sentiment_analyst", "news_sentiment_analyst")]
    tech_trend = tech_list[0]["signal"] if tech_list else "neutral"
    sent_avg   = _avg_score(sent_list) if sent_list else 0.0
    sentiment  = "bullish" if sent_avg > 0.2 else ("bearish" if sent_avg < -0.2 else "neutral")

    return {
        "stock_type":                stock_type,
        "taleb_risk_gate":           taleb_gate,
        "taleb_position_factor":     taleb_factor,
        "damodaran_anchor":          dam_anchor,
        "damodaran_confidence_adj":  dam_adj,
        "value_committee":           value_comm,
        "growth_committee":          growth_comm,
        "contrarian_macro_committee":macro_comm,
        "weighted_score":            round(weighted_score, 3),
        "dominant_committee":        dominant,
        "technical_trend":           tech_trend,
        "overall_sentiment":         sentiment,
    }


def _committee_context_str(tickers: list[str], committee_analysis: dict) -> str:
    """Serialise committee analysis into a compact string for the LLM prompt."""
    lines = []
    for ticker in tickers:
        ca = committee_analysis.get(ticker)
        if not ca:
            continue
        lines.append(f"\n[{ticker}]")
        lines.append(
            f"  StockType:{ca['stock_type']} | "
            f"Taleb:{ca['taleb_risk_gate']}({ca['taleb_position_factor']}x) | "
            f"Damodaran:{ca['damodaran_anchor']}({ca['damodaran_confidence_adj']}x)"
        )
        for key, label in [
            ("value_committee",            "Value"),
            ("growth_committee",           "Growth"),
            ("contrarian_macro_committee", "Macro"),
        ]:
            c = ca.get(key, {})
            if c.get("agents"):
                w  = int(c["weight"] * 100)
                s  = c["score"]
                ag = ", ".join(
                    f"{a['name']}({'↑' if a['signal']=='bullish' else '↓' if a['signal']=='bearish' else '→'})"
                    for a in c["agents"]
                )
                lines.append(f"  {label}[{w}%] score:{s:+.2f} | {ag}")
        lines.append(
            f"  Dominant:{ca['dominant_committee']} "
            f"WeightedScore:{ca['weighted_score']:+.2f} "
            f"Tech:{ca['technical_trend']} Sentiment:{ca['overall_sentiment']}"
        )
    return "\n".join(lines) if lines else "No committee data available."


# ── Main agent ─────────────────────────────────────────────────────────────
def portfolio_management_agent(state: AgentState, agent_id: str = "portfolio_manager"):
    """Makes final trading decisions using the 3-committee framework."""

    portfolio       = state["data"]["portfolio"]
    analyst_signals = state["data"]["analyst_signals"]
    tickers         = state["data"]["tickers"]

    position_limits   = {}
    current_prices    = {}
    max_shares        = {}
    signals_by_ticker = {}
    committee_analysis: dict[str, dict] = {}

    for ticker in tickers:
        progress.update_status(agent_id, ticker, "Processing analyst signals")

        # Locate the paired risk manager
        if agent_id.startswith("portfolio_manager_"):
            suffix = agent_id.split("_")[-1]
            risk_manager_id = f"risk_management_agent_{suffix}"
        else:
            risk_manager_id = "risk_management_agent"

        risk_data = analyst_signals.get(risk_manager_id, {}).get(ticker, {})
        position_limits[ticker] = risk_data.get("remaining_position_limit", 0.0)
        current_prices[ticker]  = float(risk_data.get("current_price", 0.0))

        if current_prices[ticker] > 0:
            max_shares[ticker] = int(position_limits[ticker] // current_prices[ticker])
        else:
            max_shares[ticker] = 0

        # Compress signals {sig, conf}
        ticker_signals = {}
        for agent, signals in analyst_signals.items():
            if not agent.startswith("risk_management_agent") and ticker in signals:
                sig  = signals[ticker].get("signal")
                conf = signals[ticker].get("confidence")
                if sig is not None and conf is not None:
                    ticker_signals[agent] = {"sig": sig, "conf": conf}
        signals_by_ticker[ticker] = ticker_signals

        # Build committee analysis (deterministic, no LLM)
        committee_analysis[ticker] = build_committee_analysis(ticker, analyst_signals)

    state["data"]["current_prices"]    = current_prices
    state["data"]["committee_analysis"] = committee_analysis

    progress.update_status(agent_id, None, "Generating trading decisions")

    result = generate_trading_decision(
        tickers=tickers,
        signals_by_ticker=signals_by_ticker,
        current_prices=current_prices,
        max_shares=max_shares,
        portfolio=portfolio,
        committee_analysis=committee_analysis,
        agent_id=agent_id,
        state=state,
    )

    message = HumanMessage(
        content=json.dumps({ticker: decision.model_dump() for ticker, decision in result.decisions.items()}),
        name=agent_id,
    )

    if state["metadata"]["show_reasoning"]:
        show_agent_reasoning(
            {ticker: decision.model_dump() for ticker, decision in result.decisions.items()},
            "Portfolio Manager",
        )

    progress.update_status(agent_id, None, "Done")

    return {
        "messages": state["messages"] + [message],
        "data":     state["data"],
    }


# ── Decision generation ────────────────────────────────────────────────────
def compute_allowed_actions(
    tickers: list[str],
    current_prices: dict[str, float],
    max_shares: dict[str, int],
    portfolio: dict[str, float],
) -> dict[str, dict[str, int]]:
    """Compute allowed actions and max quantities deterministically."""
    allowed = {}
    cash               = float(portfolio.get("cash", 0.0))
    positions          = portfolio.get("positions", {}) or {}
    margin_requirement = float(portfolio.get("margin_requirement", 0.5))
    margin_used        = float(portfolio.get("margin_used", 0.0))
    equity             = float(portfolio.get("equity", cash))

    for ticker in tickers:
        price       = float(current_prices.get(ticker, 0.0))
        pos         = positions.get(ticker, {"long": 0, "long_cost_basis": 0.0, "short": 0, "short_cost_basis": 0.0})
        long_shares = int(pos.get("long",  0) or 0)
        short_shares= int(pos.get("short", 0) or 0)
        max_qty     = int(max_shares.get(ticker, 0) or 0)

        actions = {"buy": 0, "sell": 0, "short": 0, "cover": 0, "hold": 0}

        if long_shares > 0:
            actions["sell"] = long_shares
        if cash > 0 and price > 0:
            max_buy = max(0, min(max_qty, int(cash // price)))
            if max_buy > 0:
                actions["buy"] = max_buy

        if short_shares > 0:
            actions["cover"] = short_shares
        if price > 0 and max_qty > 0:
            if margin_requirement <= 0.0:
                max_short = max_qty
            else:
                available_margin = max(0.0, (equity / margin_requirement) - margin_used)
                max_short = max(0, min(max_qty, int(available_margin // price)))
            if max_short > 0:
                actions["short"] = max_short

        actions["hold"] = 0
        pruned = {"hold": 0}
        for k, v in actions.items():
            if k != "hold" and v > 0:
                pruned[k] = v
        allowed[ticker] = pruned

    return allowed


def _compact_signals(signals_by_ticker: dict[str, dict]) -> dict[str, dict]:
    out = {}
    for t, agents in signals_by_ticker.items():
        if not agents:
            out[t] = {}
            continue
        compact = {}
        for agent, payload in agents.items():
            sig  = payload.get("sig")  or payload.get("signal")
            conf = payload.get("conf") if "conf" in payload else payload.get("confidence")
            if sig is not None and conf is not None:
                compact[agent] = {"sig": sig, "conf": conf}
        out[t] = compact
    return out


def generate_trading_decision(
    tickers: list[str],
    signals_by_ticker: dict[str, dict],
    current_prices: dict[str, float],
    max_shares: dict[str, int],
    portfolio: dict[str, float],
    committee_analysis: dict[str, dict],
    agent_id: str,
    state: AgentState,
) -> PortfolioManagerOutput:
    """Get decisions from the LLM, enriched with committee framework context."""

    allowed_actions_full = compute_allowed_actions(tickers, current_prices, max_shares, portfolio)

    # Pre-fill pure holds (no trade capacity)
    prefilled_decisions: dict[str, PortfolioDecision] = {}
    tickers_for_llm: list[str] = []
    for t in tickers:
        aa = allowed_actions_full.get(t, {"hold": 0})
        if set(aa.keys()) == {"hold"}:
            prefilled_decisions[t] = PortfolioDecision(
                action="hold", quantity=0, confidence=100, reasoning="No valid trade available"
            )
        else:
            tickers_for_llm.append(t)

    if not tickers_for_llm:
        return PortfolioManagerOutput(decisions=prefilled_decisions)

    compact_signals = _compact_signals({t: signals_by_ticker.get(t, {}) for t in tickers_for_llm})
    compact_allowed = {t: allowed_actions_full[t] for t in tickers_for_llm}
    committee_ctx   = _committee_context_str(tickers_for_llm, committee_analysis)

    template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a portfolio manager using a 3-committee decision framework.\n"
                "Committees: Value (Buffett/Graham/Munger/Pabrai), Growth (Lynch/Fisher/Wood/Jhunjhunwala), "
                "Macro/Contrarian (Burry/Ackman/Druckenmiller).\n"
                "Special roles: Taleb=risk gate (position factor), Damodaran=valuation anchor (confidence adj).\n"
                "Rules:\n"
                "  1. If Taleb gate=danger, keep quantity conservative (respect position factor).\n"
                "  2. If Damodaran=overvalued, be more cautious on buy/long.\n"
                "  3. Follow the dominant committee unless risk gate overrides.\n"
                "  4. Quantity must be ≤ the allowed max. Return JSON only.\n"
                "  5. Reasoning must cite which committee(s) and gates drove the decision (max 150 chars)."
            ),
            (
                "human",
                "Committee Analysis:\n{committee}\n\n"
                "Analyst Signals:\n{signals}\n\n"
                "Allowed Actions:\n{allowed}\n\n"
                "Output format:\n"
                "{{\n"
                '  "decisions": {{\n'
                '    "TICKER": {{"action":"...","quantity":int,"confidence":int,"reasoning":"..."}}\n'
                "  }}\n"
                "}}"
            ),
        ]
    )

    prompt_data = {
        "committee": committee_ctx,
        "signals":   json.dumps(compact_signals, separators=(",", ":"), ensure_ascii=False),
        "allowed":   json.dumps(compact_allowed, separators=(",", ":"), ensure_ascii=False),
    }
    prompt = template.invoke(prompt_data)

    def create_default_portfolio_output():
        decisions = dict(prefilled_decisions)
        for t in tickers_for_llm:
            decisions[t] = PortfolioDecision(
                action="hold", quantity=0, confidence=0, reasoning="Default: hold"
            )
        return PortfolioManagerOutput(decisions=decisions)

    llm_out = call_llm(
        prompt=prompt,
        pydantic_model=PortfolioManagerOutput,
        agent_name=agent_id,
        state=state,
        default_factory=create_default_portfolio_output,
    )

    merged = dict(prefilled_decisions)
    merged.update(llm_out.decisions)
    return PortfolioManagerOutput(decisions=merged)
