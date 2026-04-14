// Detailed evaluation logic for each analyst agent
// Used by the AgentLogicDialog to explain how each agent makes decisions

export interface MetricCriterion {
  name: string;
  threshold: string;
  weight: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface AnalysisStep {
  title: string;
  detail: string;
}

export interface AgentLogic {
  philosophy: string;
  approach: string;
  steps: AnalysisStep[];
  keyMetrics: MetricCriterion[];
  dataInputs: string[];
  signalRule: string;
  llmEnhanced: boolean;
}

export const AGENT_LOGIC: Record<string, AgentLogic> = {

  warren_buffett: {
    philosophy: "Seek wonderful companies at fair prices — not fair companies at wonderful prices. Focus on durable competitive advantages, honest management, and paying a price that guarantees a margin of safety.",
    approach: "Rule-based pre-screening across 6 quantitative dimensions, followed by LLM synthesis that applies Buffett's circle-of-competence reasoning to generate a final signal.",
    steps: [
      { title: "1. Fundamentals", detail: "Scores ROE (>15% = 2pts), Debt/Equity (<0.5 = 2pts), Operating Margin (>15% = 2pts), and Current Ratio (>1.5 = 1pt). Max 7 pts." },
      { title: "2. Competitive Moat", detail: "Checks 5 moat indicators: consistent high ROIC, stable/growing margins, brand strength (inferred from margins), scale advantages, and switching costs. Max 5 pts." },
      { title: "3. Earnings Consistency", detail: "Requires at least 4 periods of data. Checks whether each period's earnings exceed the prior, and calculates total growth from oldest to latest. Max 3 pts." },
      { title: "4. Pricing Power", detail: "Analyses gross margin trend and revenue growth to infer the ability to raise prices without losing customers. Max 5 pts." },
      { title: "5. Book Value Growth", detail: "Measures steady per-share book value growth as a proxy for retained earnings reinvestment quality. Max 5 pts." },
      { title: "6. Management Quality", detail: "Evaluates capital allocation via share buybacks (EPS growth vs revenue growth), dividend consistency, and return on incremental capital. Max 5 pts." },
      { title: "7. Intrinsic Value (DCF)", detail: "Owner-earnings DCF: Net Income + D&A − CapEx − ΔWorking Capital, grown at the earnings growth rate for 5 years, with a terminal value. 25% margin of safety applied." },
      { title: "8. LLM Synthesis", detail: "Claude evaluates the full score card plus circle-of-competence considerations and outputs a final bullish / neutral / bearish signal with confidence 0–100." },
    ],
    keyMetrics: [
      { name: "Return on Equity", threshold: "> 15%", weight: "High", description: "Measures how efficiently management uses shareholders' equity to generate profit." },
      { name: "Debt / Equity", threshold: "< 0.5", weight: "High", description: "Low leverage preserves financial flexibility in downturns — a Buffett hallmark." },
      { name: "Operating Margin", threshold: "> 15%", weight: "High", description: "Wide margins signal pricing power and a defensible competitive position." },
      { name: "Margin of Safety", threshold: "> 25%", weight: "High", description: "The gap between intrinsic value and market cap; Buffett's insurance against error." },
      { name: "Earnings Growth (periods)", threshold: "Consistently positive", weight: "Medium", description: "Irregular earnings are a red flag — Buffett wants predictable businesses." },
      { name: "Current Ratio", threshold: "> 1.5", weight: "Low", description: "Adequate short-term liquidity; Buffett tolerates lower ratios for capital-light firms." },
    ],
    dataInputs: ["Financial Metrics (10 TTM periods)", "Financial Line Items (10 periods)", "Market Cap"],
    signalRule: "Score ≥ 70% of max + positive margin of safety → Bullish. Score < 40% or negative MOS → Bearish. Otherwise Neutral. LLM may override based on qualitative factors.",
    llmEnhanced: true,
  },

  ben_graham: {
    philosophy: "Investment is most intelligent when it is most business-like. Demand a significant margin of safety, prefer companies trading below net current asset value, and never speculate.",
    approach: "Three pure quantitative modules — earnings stability, financial strength, and Graham valuation — are scored and summed, then LLM applies Graham's classic 'defensive investor' checklist to finalize the signal.",
    steps: [
      { title: "1. Earnings Stability", detail: "Checks how many of the available TTM periods had positive EPS (all positive = 1pt) and whether EPS grew from the earliest to the latest period (1pt). Max 2 pts." },
      { title: "2. Financial Strength", detail: "Current Ratio ≥ 2.0 (2pts), Debt/Assets < 0.5 (2pts), dividend paid in majority of periods (1pt). Max 5 pts." },
      { title: "3. NCAV Check (Net-Net)", detail: "NCAV = Current Assets − Total Liabilities. If NCAV > Market Cap → classic Graham deep value (4pts). If NCAV/Share ≥ 2/3 of Price/Share → partial discount (2pts)." },
      { title: "4. Graham Number", detail: "√(22.5 × EPS × Book Value per Share). If current price is well below the Graham Number, a margin of safety exists: >50% MOS = 3pts, >20% MOS = 1pt." },
      { title: "5. LLM Synthesis", detail: "Claude applies the full Graham defensive investor criteria list, checks P/E ≤ 15, P/B ≤ 1.5, and moderate debt, then produces the final signal." },
    ],
    keyMetrics: [
      { name: "NCAV vs Market Cap", threshold: "NCAV > Market Cap", weight: "High", description: "Graham's ultimate 'net-net' signal — buying $1 of assets for less than $1." },
      { name: "Graham Number vs Price", threshold: "Price < Graham Number", weight: "High", description: "Upper bound fair value = √(22.5 × EPS × BVPS). Price below this indicates undervaluation." },
      { name: "Margin of Safety", threshold: "> 50%", weight: "High", description: "Graham demanded a large cushion to protect against analytic errors and bad luck." },
      { name: "Current Ratio", threshold: "≥ 2.0", weight: "Medium", description: "Twice current liabilities covered — Graham's conservative liquidity standard." },
      { name: "Debt / Assets", threshold: "< 0.5", weight: "Medium", description: "Moderate leverage ensures the company can withstand adversity." },
      { name: "EPS (all periods positive)", threshold: "100% positive years", weight: "Medium", description: "Consistent profits signal a stable business, not a speculative one." },
    ],
    dataInputs: ["Financial Metrics (10 TTM periods)", "Financial Line Items (10 periods)", "Market Cap"],
    signalRule: "Total score ≥ 7 → strongly bullish candidate. Score ≤ 3 → bearish. LLM finalises by applying the full 10-point Graham defensive checklist.",
    llmEnhanced: true,
  },

  fundamentals_analyst: {
    philosophy: "Let the numbers speak. A systematic, rules-based scan across profitability, growth, financial health, and valuation — no LLM bias, just signals.",
    approach: "Four parallel sub-analyses each cast a bullish / neutral / bearish vote. The majority vote becomes the overall signal; confidence scales with vote margin.",
    steps: [
      { title: "1. Profitability", detail: "ROE > 15% and Net Margin > 20% and Operating Margin > 15% → Bullish. Any two → Neutral. All below → Bearish." },
      { title: "2. Growth", detail: "Revenue Growth > 10% and Earnings Growth > 10% and Book Value Growth > 10% → Bullish. Mixed → Neutral. All negative → Bearish." },
      { title: "3. Financial Health", detail: "Current Ratio > 1.5 and D/E < 0.5 and FCF > 80% of EPS → Bullish. Partial → Neutral. All failing → Bearish." },
      { title: "4. Valuation (Price Ratios)", detail: "P/E ≤ 25 and P/B ≤ 3 and P/S ≤ 5 → Bullish (cheap). Above all thresholds → Bearish (expensive). Mixed → Neutral." },
      { title: "5. Signal Aggregation", detail: "Count bullish vs bearish votes. Majority wins. Confidence = max(bullish, bearish) / total votes × 100." },
    ],
    keyMetrics: [
      { name: "Return on Equity", threshold: "> 15%", weight: "High", description: "Core profitability: ability to generate returns from equity capital." },
      { name: "Net Margin", threshold: "> 20%", weight: "High", description: "After-tax profit retained per dollar of revenue — reflects cost efficiency." },
      { name: "Revenue Growth", threshold: "> 10%", weight: "High", description: "Top-line expansion indicates market share gains or pricing power." },
      { name: "Current Ratio", threshold: "> 1.5", weight: "Medium", description: "Liquidity cushion to cover near-term obligations without stress." },
      { name: "Debt / Equity", threshold: "< 0.5", weight: "Medium", description: "Conservative leverage reduces bankruptcy risk in downturns." },
      { name: "P/E Ratio", threshold: "< 25", weight: "Medium", description: "Earnings multiple — high P/E means paying more for each dollar of earnings." },
      { name: "FCF / EPS", threshold: "FCF > 80% EPS", weight: "Medium", description: "Earnings quality check: real cash flows should match reported earnings." },
    ],
    dataInputs: ["Financial Metrics (10 TTM periods — latest period used)"],
    signalRule: "Majority of 4 sub-signals wins. Ties go Neutral. Confidence = vote share of winning side.",
    llmEnhanced: false,
  },

  valuation_analyst: {
    philosophy: "Every asset has an intrinsic value. Four independent models each estimate it; their weighted average compared to market cap determines whether the stock is cheap or expensive.",
    approach: "Four valuation models run in parallel, each producing an estimated enterprise value. A weighted gap score (intrinsic − market cap) / market cap drives the signal.",
    steps: [
      { title: "1. Enhanced DCF (weight 35%)", detail: "Multi-stage FCF model: high-growth phase (yrs 1–3), transition phase (yrs 4–7), terminal value. Three scenarios (bear/base/bull) probability-weighted 20/60/20. WACC calculated from market data." },
      { title: "2. Owner Earnings (weight 35%)", detail: "Buffett's owner earnings = Net Income + D&A − CapEx − ΔWC. Grown for 5 years then terminal value. 25% margin of safety haircut applied." },
      { title: "3. EV / EBITDA (weight 20%)", detail: "Historical median EV/EBITDA multiple applied to current EBITDA to get implied enterprise value, then subtract net debt for equity value." },
      { title: "4. Residual Income (weight 10%)", detail: "Edwards–Bell–Ohlson model: PV of future residual income (Net Income − Cost of Equity × Book Value) plus current book value. 20% haircut applied." },
      { title: "5. WACC Calculation", detail: "Cost of equity via CAPM (risk-free + beta × market premium). Cost of debt estimated from interest coverage ratio. Weighted by capital structure. Floored at 6%, capped at 20%." },
      { title: "6. Weighted Gap & Signal", detail: "Gap = (model value − market cap) / market cap. Weighted average gap > 15% → Bullish (undervalued). Gap < −15% → Bearish (overvalued). Otherwise Neutral." },
    ],
    keyMetrics: [
      { name: "DCF Weighted Gap", threshold: "> 15% bullish", weight: "High", description: "Primary signal driver: how far intrinsic value exceeds current market cap." },
      { name: "WACC", threshold: "6% – 20% range", weight: "High", description: "Discount rate — higher WACC produces lower present values and more conservative estimates." },
      { name: "FCF Periods Available", threshold: "≥ 3 for reliability", weight: "Medium", description: "More periods = more reliable FCF trend extrapolation for DCF." },
      { name: "Owner Earnings Value", threshold: "vs Market Cap", weight: "High", description: "Buffett's preferred valuation metric — rewards businesses with high real cash conversion." },
      { name: "EV/EBITDA Multiple", threshold: "Median historical", weight: "Medium", description: "Mean-reversion assumption: current multiple should revert to historical median." },
    ],
    dataInputs: ["Financial Metrics (8 TTM periods)", "Line Items: FCF, Net Income, D&A, CapEx, Working Capital, Debt, Cash, Revenue, EBIT, EBITDA (8 periods)", "Market Cap"],
    signalRule: "Weighted avg gap > +15% → Bullish (confidence scales to 100% at 30% gap). < −15% → Bearish. Between → Neutral.",
    llmEnhanced: false,
  },

  technical_analyst: {
    philosophy: "Price action contains all available information. Combine multiple timeframe signals — trend, mean reversion, momentum, volatility, and stat arb — into a single probability-weighted view.",
    approach: "Five independent technical strategies each produce a signal and confidence. A fixed weight ensemble combines them into a final signal.",
    steps: [
      { title: "1. Trend Following (25%)", detail: "EMA 8/21/55 crossovers, ADX for trend strength, Supertrend indicator. Bullish when short EMAs above long EMAs and ADX > 25." },
      { title: "2. Mean Reversion (20%)", detail: "Bollinger Bands (20-day, 2σ), RSI divergence, z-score of price vs 20-day MA. Signal when price is statistically stretched from mean." },
      { title: "3. Momentum (25%)", detail: "Rate-of-change over multiple lookbacks, MACD signal line crossovers, RSI level (>50 bullish). Momentum in the direction of the primary trend." },
      { title: "4. Volatility (15%)", detail: "ATR trend (expanding = caution), historical vs implied vol, Bollinger Band width. High volatility reduces confidence; low vol breakouts are bullish." },
      { title: "5. Statistical Arbitrage (15%)", detail: "Z-score of returns, skewness and kurtosis of recent price distribution, autocorrelation of returns. Mean-reversion opportunities from statistical extremes." },
      { title: "6. Ensemble Combination", detail: "Each strategy's signal (bullish=+1, neutral=0, bearish=−1) is weighted and summed. Final confidence = weighted score normalised to 0–100%." },
    ],
    keyMetrics: [
      { name: "Trend Signal", threshold: "Bullish / Neutral / Bearish", weight: "High", description: "EMA alignment and ADX strength — the primary directional bias." },
      { name: "Momentum Signal", threshold: "Bullish / Neutral / Bearish", weight: "High", description: "Rate of change and MACD — confirms or contradicts the trend." },
      { name: "Mean Reversion Signal", threshold: "Bullish / Neutral / Bearish", weight: "Medium", description: "RSI and Bollinger Band extremes — counter-trend opportunity." },
      { name: "Volatility Signal", threshold: "Bullish / Neutral / Bearish", weight: "Medium", description: "Regime detection — low-vol bull trends vs high-vol uncertainty." },
      { name: "Stat Arb Signal", threshold: "Bullish / Neutral / Bearish", weight: "Low", description: "Return distribution statistics — identifies statistical mispricings." },
    ],
    dataInputs: ["Daily Price Data (OHLCV) for the full analysis window"],
    signalRule: "Weighted sum of 5 strategy signals. > 0.15 weighted score → Bullish. < −0.15 → Bearish. Between → Neutral. Confidence = |weighted score| × 100.",
    llmEnhanced: false,
  },

  charlie_munger: {
    philosophy: "Invert, always invert. Find a wonderful business at a fair price, not a fair business at a wonderful price. Avoid stupidity more than seeking brilliance.",
    approach: "Quantitative pre-screening of business quality and valuation, followed by LLM applying Munger's mental models: inversion, circle of competence, and the lollapalooza effect.",
    steps: [
      { title: "1. Business Predictability", detail: "Checks revenue and earnings consistency over multiple periods. Predictable, growing businesses score higher." },
      { title: "2. Competitive Moat Strength", detail: "Evaluates ROIC stability, gross margin trend, and operating leverage. Strong moats show improving returns with scale." },
      { title: "3. Management Quality", detail: "Capital allocation quality: share count trend, FCF conversion, dividend policy, return on incremental invested capital." },
      { title: "4. Munger-Style Valuation", detail: "Simplified owner-earnings based valuation with a focus on long-term normalised earnings power. Rejects single-year snapshots." },
      { title: "5. LLM Synthesis", detail: "Claude applies Munger's checklist: circle of competence, inversion (what could go wrong?), mental models, and the lollapalooza effect (multiple reinforcing factors)." },
    ],
    keyMetrics: [
      { name: "ROIC Consistency", threshold: "> 15% consistently", weight: "High", description: "Munger's favourite quality signal — sustained high returns on invested capital." },
      { name: "Gross Margin Trend", threshold: "Stable or expanding", weight: "High", description: "Expanding margins signal a strengthening competitive position." },
      { name: "FCF Conversion", threshold: "FCF ≈ Net Income", weight: "Medium", description: "Real earnings quality — reported profits should be backed by cash." },
      { name: "Revenue Predictability", threshold: "Low variance", weight: "Medium", description: "Munger prefers businesses whose future revenues are highly predictable." },
    ],
    dataInputs: ["Financial Metrics (10 TTM periods)", "Financial Line Items (10 periods)", "Market Cap", "Company News", "Insider Trades"],
    signalRule: "LLM-driven after quantitative pre-screening. Munger's framework penalises complexity, debt, and cyclicality; rewards simplicity, moat, and management quality.",
    llmEnhanced: true,
  },

  cathie_wood: {
    philosophy: "Invest in disruptive innovation. The biggest risk is not owning the companies that will reshape the global economy over the next 5–10 years.",
    approach: "Screens for high-growth, innovation-driven companies. Focuses on total addressable market (TAM) expansion, technology disruption, and platform economics. LLM applies ARK-style framework.",
    steps: [
      { title: "1. Revenue Growth Rate", detail: "Cathie Wood targets companies growing revenue > 25–30% annually. Slower growers are deprioritised." },
      { title: "2. Innovation Score", detail: "Looks for IP spending, R&D as % of revenue, product pipeline, and whether the company operates in a disruption-prone sector." },
      { title: "3. TAM Analysis", detail: "Estimates addressable market size and penetration rate. Early-stage companies with large TAM and low penetration score highest." },
      { title: "4. Platform / Network Effects", detail: "Checks for user growth, engagement metrics, and cross-product synergies that create winner-take-most dynamics." },
      { title: "5. LLM Synthesis", detail: "Claude applies ARK's 5-year price target framework, Wright's Law (cost decline through cumulative production), and disruptive innovation theory." },
    ],
    keyMetrics: [
      { name: "Revenue Growth", threshold: "> 25% YoY", weight: "High", description: "Cathie Wood's primary screen — hyper-growth is the core thesis." },
      { name: "R&D / Revenue", threshold: "High relative to sector", weight: "High", description: "Innovation investment as a % of revenue signals future competitive advantage." },
      { name: "Gross Margin Trajectory", threshold: "Expanding over time", weight: "Medium", description: "Scale benefits and platform economics should improve margins as the company grows." },
      { name: "TAM Penetration", threshold: "< 10% (early stage)", weight: "Medium", description: "Low penetration in a large market signals massive room to grow." },
    ],
    dataInputs: ["Financial Metrics (10 TTM periods)", "Financial Line Items (10 periods)", "Market Cap", "Company News"],
    signalRule: "LLM applies ARK innovation framework. Strong innovation + large TAM + early penetration → Bullish. Mature business with slowing growth → Bearish.",
    llmEnhanced: true,
  },

  michael_burry: {
    philosophy: "Be fearful when others are greedy. Find asymmetric opportunities in deeply misunderstood or overlooked assets trading far below intrinsic value.",
    approach: "Contrarian deep value screening focused on assets the market has misfiled. High emphasis on balance sheet assets, FCF yield, and downturn resilience.",
    steps: [
      { title: "1. Asset Value Screen", detail: "Checks book value, tangible assets, and liquidation value relative to market cap. Burry targets situations where hard assets support the price." },
      { title: "2. FCF Yield", detail: "Free cash flow / Market Cap. Burry wants FCF yields > 10% — cheap cash-generating businesses the market is ignoring." },
      { title: "3. Debt & Downside Risk", detail: "Stress tests the balance sheet: what happens in a severe recession? Avoids companies that could go bankrupt in a downturn." },
      { title: "4. Contrarian Signal", detail: "Looks for high short interest, poor recent price performance, or negative news flow as a contrarian buying signal (not a selling signal)." },
      { title: "5. LLM Synthesis", detail: "Claude applies Burry's framework: what is the market missing? Is there a structural reason for the mispricing? What is the exit catalyst?" },
    ],
    keyMetrics: [
      { name: "FCF Yield", threshold: "> 10%", weight: "High", description: "Burry's core value screen — the amount of free cash generated per dollar invested." },
      { name: "P/B Ratio", threshold: "< 1.0 ideally", weight: "High", description: "Buying below book value provides a hard-asset margin of safety." },
      { name: "Debt / Equity", threshold: "< 1.0", weight: "High", description: "Manageable leverage prevents forced selling or bankruptcy in a downturn." },
      { name: "Short Interest", threshold: "High = contrarian opportunity", weight: "Medium", description: "Burry often investigates heavily shorted stocks for mispricing opportunities." },
    ],
    dataInputs: ["Financial Metrics (10 TTM periods)", "Financial Line Items (10 periods)", "Market Cap", "Insider Trades", "Company News"],
    signalRule: "LLM-driven contrarian analysis. Deep value + catalyst + market misunderstanding → Bullish. Overvalued or fragile balance sheet → Bearish.",
    llmEnhanced: true,
  },

  sentiment_analyst: {
    philosophy: "Markets are driven by human psychology. Insider buying is the purest bullish signal; excessive pessimism creates opportunity.",
    approach: "Aggregates signals from insider trading patterns and news sentiment. No LLM — pure rules-based signal from behavioural data.",
    steps: [
      { title: "1. Insider Trading Analysis", detail: "Counts net insider buys vs sells over the analysis period. A cluster of buys from multiple insiders (not just one) is a strong signal." },
      { title: "2. Transaction Size Weighting", detail: "Large transactions by C-suite executives weighted more heavily than small purchases by board members." },
      { title: "3. News Sentiment Scoring", detail: "Aggregates recent news headlines and scores sentiment (positive / negative / neutral). High negative sentiment can be a contrarian buy signal." },
      { title: "4. Signal Combination", detail: "Insider signal and news sentiment combined with configurable weights to produce overall sentiment signal." },
    ],
    keyMetrics: [
      { name: "Net Insider Buys", threshold: "More buys than sells", weight: "High", description: "Insiders know the business best — coordinated buying is a powerful signal." },
      { name: "Transaction Volume", threshold: "Large size = stronger signal", weight: "High", description: "A CEO buying $10M of stock is more meaningful than a board member buying $10K." },
      { name: "News Sentiment Score", threshold: "> 0 = positive", weight: "Medium", description: "Aggregate tone of recent news coverage reflects market perception." },
    ],
    dataInputs: ["Insider Trades (last 90 days)", "Company News (last 90 days)"],
    signalRule: "Net insider buys + positive news → Bullish. Net insider sells + negative news → Bearish. Mixed signals → Neutral.",
    llmEnhanced: false,
  },

  aswath_damodaran: {
    philosophy: "Every asset has an intrinsic value. The job of a valuation analyst is to estimate that value with intellectual honesty — no story-telling, no hope, just disciplined analysis of cash flows, growth, and risk.",
    approach: "Three quantitative modules — growth & reinvestment quality, risk profile, and relative valuation — are scored and summed. An independent DCF is run to compute margin of safety. LLM applies Damodaran's 'narrative meets numbers' framework to synthesise the final signal.",
    steps: [
      { title: "1. Growth & Reinvestment Quality (max 4 pts)", detail: "Estimates revenue CAGR from historical data. CAGR >8% = 2pts, >3% = 1pt. Checks whether growth is profitable: positive net income trend adds 1pt. High ROIC (>10%) signals efficient reinvestment adds 1pt." },
      { title: "2. Risk Profile (max 3 pts)", detail: "Analyses three risk dimensions: earnings volatility (stable EPS = 1pt), financial leverage (D/E <0.5 = 1pt), operating risk (stable operating margins = 1pt). Feeds into cost of equity for DCF." },
      { title: "3. Relative Valuation (max 1 pt)", detail: "Compares current P/E to the median P/E across available historical periods. If current P/E < 70% of median P/E, the stock is cheap relative to its own history (1pt)." },
      { title: "4. Intrinsic Value DCF", detail: "Custom DCF using a base revenue growth rate (capped at 12% pa), declining to 2.5% terminal growth. Cost of equity defaults to 9% adjusted by risk score. Compares DCF value to market cap for margin of safety." },
      { title: "5. LLM Synthesis", detail: "Claude applies Damodaran's framework: narrative consistency, growth quality, reinvestment efficiency, and risk-adjusted return expectations. Penalises companies where the narrative does not support the numbers." },
    ],
    keyMetrics: [
      { name: "Revenue CAGR", threshold: "> 8% = strong", weight: "High", description: "Damodaran's primary growth input — sustained revenue growth drives long-term value." },
      { name: "ROIC", threshold: "> 10%", weight: "High", description: "Return on Invested Capital — ensures growth is profitable, not just large." },
      { name: "Margin of Safety (DCF)", threshold: "> 25% bullish", weight: "High", description: "Gap between DCF intrinsic value and market cap — primary valuation signal." },
      { name: "P/E vs Historical Median", threshold: "< 70% of median", weight: "Medium", description: "Relative cheapness vs the company's own history." },
      { name: "Earnings Stability", threshold: "Positive trend", weight: "Medium", description: "Volatile earnings inflate risk premium and reduce DCF reliability." },
      { name: "Debt / Equity", threshold: "< 0.5", weight: "Medium", description: "Higher leverage increases financial distress risk and cost of capital." },
    ],
    dataInputs: ["Financial Metrics (5 TTM periods)", "Financial Line Items (5 periods)", "Market Cap"],
    signalRule: "Score ≥ 60% of max (4.8/8) AND margin of safety ≥ 25% → Bullish. Score ≤ 40% OR margin of safety ≤ −25% → Bearish. Otherwise Neutral. LLM may adjust.",
    llmEnhanced: true,
  },

  bill_ackman: {
    philosophy: "Find high-quality, simple, predictable, free-cash-flow-generative businesses with a durable competitive advantage — then buy them at a meaningful discount. If management is destroying value, become the catalyst for change.",
    approach: "Four quantitative modules score business quality, balance sheet discipline, activism potential, and valuation. Total score ≥ 70% of max = bullish. LLM adds Ackman's activist overlay and concentration-portfolio thinking.",
    steps: [
      { title: "1. Business Quality (max 10 pts)", detail: "Revenue growth consistency (>15% adds 2pts, positive trend adds 1pt), operating margin (>15% for majority of periods = 2pts, improving = 1pt), ROE (>15% = 2pts), FCF conversion quality (high FCF/Net Income = 2pts). Reflects Ackman's preference for wide-moat businesses." },
      { title: "2. Financial Discipline (max 5 pts)", detail: "Checks debt management: D/A <50% for majority of periods (2pts), declining leverage trend (1pt), consistent FCF generation (1pt), low capex intensity relative to revenue (1pt). Ackman avoids overleveraged companies." },
      { title: "3. Activism Potential (max 3 pts)", detail: "High revenue growth but low margins (>15% rev growth, <10% op margin) signals underperforming management ripe for activist engagement (2pts). Improving margin trend (management already improving) adds 1pt." },
      { title: "4. Valuation (max 5 pts)", detail: "Owner-earnings DCF (6% growth rate, 15% required return) compared to market cap. Value > 2× market cap (4pts), > 1.5× (3pts), > market cap (2pts), >0.75× (1pt). Ackman demands a significant discount to intrinsic value." },
      { title: "5. LLM Synthesis", detail: "Claude evaluates the business through Ackman's concentrated portfolio lens: is this a top-10 position quality? Is there a clear catalyst? Would activism unlock value? Final signal with confidence 0–100." },
    ],
    keyMetrics: [
      { name: "Operating Margin", threshold: "> 15% consistently", weight: "High", description: "Ackman's quality filter — wide, stable margins signal a durable moat." },
      { name: "FCF Conversion", threshold: "FCF ≈ Net Income", weight: "High", description: "Real cash generation backing reported earnings is non-negotiable for Ackman." },
      { name: "Owner Earnings DCF vs Market Cap", threshold: "Value > 1.5× market cap", weight: "High", description: "Significant valuation discount required for Ackman's concentrated bets." },
      { name: "Revenue Growth", threshold: "> 15% consistent", weight: "High", description: "Ackman wants businesses growing their competitive position, not shrinking." },
      { name: "Debt / Assets", threshold: "< 50%", weight: "Medium", description: "Conservative leverage so the business can survive adversity and fund activism." },
      { name: "Activism Potential", threshold: "High rev growth + low margins", weight: "Medium", description: "Mismanaged high-quality businesses offer the greatest activist upside." },
    ],
    dataInputs: ["Financial Metrics (5 annual periods)", "Financial Line Items (5 periods)", "Market Cap"],
    signalRule: "Score ≥ 70% of 23 pts (≥16 pts) → Bullish. Score ≤ 30% (≤7 pts) → Bearish. Between → Neutral. LLM applies activist overlay.",
    llmEnhanced: true,
  },

  mohnish_pabrai: {
    philosophy: "Heads I win, tails I don't lose much. Only make bets with asymmetric payoffs — limited downside, large upside. Copy the best ideas shamelessly. Concentrate in your highest-conviction positions.",
    approach: "Three modules with explicit weights: downside protection (45%), valuation / FCF yield (35%), double potential (20%). Pure quantitative scoring — LLM synthesises with Pabrai's 'Dhandho' framework.",
    steps: [
      { title: "1. Downside Protection (45% weight, max 10 pts)", detail: "Current ratio >2.0 (3pts), D/E <0.3 (2pts), <0.7 (1pt). FCF positive for majority of periods (2pts). Stable/growing earnings (2pts). Ensures 'tails I don't lose much'." },
      { title: "2. Pabrai Valuation (35% weight, max 10 pts)", detail: "FCF yield = FCF / Market Cap. >10% yield (4pts), >7% (3pts), >5% (2pts). Owner-earnings adjusted for sustainability. Low valuations with high cash yield are the sweet spot." },
      { title: "3. Double Potential (20% weight, max 10 pts)", detail: "Can the stock 2× in 2–3 years? Checks EV/EBITDA vs history, price vs book value, and revenue growth momentum. Pabrai only invests when he sees a clear path to doubling." },
      { title: "4. Composite Score", detail: "Total = downside × 0.45 + valuation × 0.35 + double × 0.20. Max = 10. Pabrai's asymmetric weighting heavily penalises fragile balance sheets even when valuation is attractive." },
      { title: "5. LLM Synthesis", detail: "Claude applies Pabrai's Dhandho principles: is this a low-risk, high-uncertainty situation (not high-risk)? Is the business a 'cloned' proven model? Is the moat durable? Final signal and confidence." },
    ],
    keyMetrics: [
      { name: "FCF Yield", threshold: "> 10% = strong", weight: "High", description: "Pabrai's primary value filter — high cash returns ensure asymmetric upside." },
      { name: "Current Ratio", threshold: "> 2.0", weight: "High", description: "Pabrai demands financial fortress-like balance sheets for downside protection." },
      { name: "Debt / Equity", threshold: "< 0.3 ideal", weight: "High", description: "Ultra-conservative leverage to ensure tails don't lose much." },
      { name: "Double Potential (2× in 2–3 yrs)", threshold: "Clear path visible", weight: "High", description: "Pabrai's core investment criterion — if he can't see doubling, he passes." },
      { name: "FCF Consistency", threshold: "Positive majority of periods", weight: "Medium", description: "Consistent FCF generation is the foundation of sustainable downside protection." },
    ],
    dataInputs: ["Financial Metrics (8 annual periods)", "Financial Line Items (8 periods)", "Market Cap"],
    signalRule: "Composite score ≥ 7.5/10 → Bullish. Score ≤ 4.0 → Bearish. Between → Neutral. LLM confirms Dhandho principles met.",
    llmEnhanced: true,
  },

  nassim_taleb: {
    philosophy: "Avoid ruin above all else. Seek antifragility — systems that gain from disorder. Use a barbell strategy: safe core + convex upside bets. Penalise fragility ruthlessly via negativa.",
    approach: "Seven independent analyses covering tail risk, antifragility, convexity, fragility, skin-in-the-game, volatility regime, and black swan signals. All scores summed; high total score means low fragility and potential for asymmetric upside.",
    steps: [
      { title: "1. Tail Risk Analysis (price-based)", detail: "Computes return skewness, kurtosis, and tail ratio from price history. Positive skew (2pts), near-zero skew (1pt), low max drawdown (>−15% = 2pts, >−30% = 1pt)." },
      { title: "2. Antifragility (balance sheet)", detail: "Checks cash cushion (>20% of market cap = 3pts), low debt (D/A <30% = 2pts, <50% = 1pt), positive FCF growth under stress. Antifragile companies get stronger in downturns." },
      { title: "3. Convexity Analysis", detail: "R&D and capex as % of revenue (optionality investments). FCF/revenue stability. Price momentum as tail indicator. Convex payoffs: limited downside, large upside." },
      { title: "4. Fragility Score (inverted)", detail: "Detects fragility warning signs: high D/E, declining FCF, high operating leverage, revenue concentration. High fragility score means the company breaks under stress — bearish." },
      { title: "5. Skin in the Game", detail: "Insider buys vs sells. Management buys own stock → aligned incentives (bullish). Pure selling → misaligned, possible red flag." },
      { title: "6. Volatility Regime", detail: "Classifies price volatility regime: low and declining vol = stable environment (bullish). High and rising vol = uncertainty (bearish). Uses rolling vol measures." },
      { title: "7. Black Swan Sentinel", detail: "Scans news for tail-risk keywords (lawsuit, investigation, fraud, bankruptcy, regulatory) and sharp recent price drops. Negative news clusters trigger bearish signals." },
    ],
    keyMetrics: [
      { name: "Return Skewness", threshold: "> 0 = positive tail", weight: "High", description: "Positive skew means occasional large gains — the Taleb ideal for investments." },
      { name: "Max Drawdown", threshold: "> −15% = robust", weight: "High", description: "Historical worst loss. Fragile companies suffer catastrophic drawdowns." },
      { name: "Cash / Market Cap", threshold: "> 20%", weight: "High", description: "Cash cushion provides antifragility — can absorb shocks and exploit crises." },
      { name: "Debt / Assets", threshold: "< 30%", weight: "High", description: "Low leverage = low fragility. Debt is the primary source of ruin risk." },
      { name: "R&D + CapEx / Revenue", threshold: "Meaningful investment", weight: "Medium", description: "Optionality investment — bets on future payoffs that could be convex." },
      { name: "Black Swan Signals", threshold: "Zero negative signals", weight: "High", description: "Any bankruptcy/fraud/regulatory signal triggers immediate caution." },
    ],
    dataInputs: ["Financial Metrics (10 TTM periods)", "Price Data (full window)", "Financial Line Items (10 periods)", "Insider Trades", "Company News", "Market Cap"],
    signalRule: "Total score as % of max: ≥ 60% → Bullish. ≤ 35% OR any black swan signal → Bearish. Between → Neutral. LLM applies Taleb's barbell and via negativa frameworks.",
    llmEnhanced: true,
  },

  peter_lynch: {
    philosophy: "Invest in what you know. The best investment opportunities are in companies whose products you use and understand. Find the 10-baggers hiding in plain sight before Wall Street discovers them.",
    approach: "Five weighted modules covering Lynch-style growth, fundamentals, valuation (PEG ratio focus), news sentiment, and insider activity. ≥ 7.5/10 composite = bullish.",
    steps: [
      { title: "1. Lynch Growth Analysis (30% weight)", detail: "Revenue growth: >25% = 3pts, >10% = 2pts, >2% = 1pt. EPS growth: same scale. Checks 'story type': fast grower (>25% rev CAGR), stalwart (10–25%), slow grower (<10%). Lynch loves fast growers with staying power." },
      { title: "2. Lynch Fundamentals (20% weight)", detail: "D/E <0.5 (2pts), current ratio >1.5 (2pts), positive FCF (2pts), growing book value (1pt), inventory growing slower than revenue (1pt) — Lynch's warning sign when inventory builds faster than sales." },
      { title: "3. Lynch Valuation — PEG Ratio (25% weight)", detail: "PEG = P/E ÷ EPS growth rate. PEG <0.5 = 4pts (steal), PEG <1.0 = 3pts (good), PEG <1.5 = 2pts (fair), PEG <2.0 = 1pt. Lynch's famous rule: a PEG <1 is cheap, >2 is expensive regardless of growth." },
      { title: "4. News Sentiment (15% weight)", detail: "Scores recent news headlines as positive / negative / neutral. Positive coverage of new products, market expansion, or earnings beats score highest. Lynch prefers boring companies with no press coverage — but good news is better than bad." },
      { title: "5. Insider Activity (10% weight)", detail: "Net insider buy/sell ratio. Multiple insiders buying in the same period = strong signal (3pts). One insider buying = moderate (2pts). No activity = neutral (1pt). Selling = 0pts." },
    ],
    keyMetrics: [
      { name: "PEG Ratio", threshold: "< 1.0 ideal", weight: "High", description: "Lynch's signature metric: P/E relative to growth rate. Below 1 = potentially undervalued." },
      { name: "Revenue Growth", threshold: "> 25% = fast grower", weight: "High", description: "Lynch built his fortune on fast growers — companies growing earnings 20–30%+ pa." },
      { name: "EPS Growth", threshold: "> 25% = strong", weight: "High", description: "Earnings per share must grow to support a rising stock price long-term." },
      { name: "Debt / Equity", threshold: "< 0.5", weight: "Medium", description: "Lynch avoided heavily indebted companies — debt kills companies in recessions." },
      { name: "Inventory vs Revenue Growth", threshold: "Inventory < Revenue growth", weight: "Medium", description: "Inventory building faster than sales is Lynch's #1 early warning signal." },
      { name: "Insider Buys", threshold: "Multiple insiders buying", weight: "Low", description: "Coordinated insider buying is a vote of confidence from those who know most." },
    ],
    dataInputs: ["Financial Line Items (10 periods)", "Market Cap", "Company News (last 90 days)", "Insider Trades (last 90 days)"],
    signalRule: "Composite weighted score ≥ 7.5/10 → Bullish. ≤ 4.5 → Bearish. Between → Neutral. LLM applies 'invest in what you know' category analysis.",
    llmEnhanced: true,
  },

  phil_fisher: {
    philosophy: "Buy and never sell outstanding growth companies. The real money in investment will be made not by the in-and-out trader but by those who buy right and hold on — through 'scuttlebutt' research that goes beyond financial statements.",
    approach: "Six weighted modules: growth quality (30%), margin stability (25%), management efficiency (20%), Fisher valuation (15%), insider activity (5%), and news sentiment (5%). ≥ 7.5/10 = bullish.",
    steps: [
      { title: "1. Growth Quality (30% weight)", detail: "Revenue growth trend (>25% = 3pts, >10% = 2pts, >0% = 1pt). EPS growth trend (same scale). R&D as % of revenue: 3–15% = 3pts (healthy innovation), >15% = 2pts (heavy investment), >0% = 1pt. R&D spend is Fisher's key differentiator — it signals future competitive advantage." },
      { title: "2. Margin Stability (25% weight)", detail: "Checks gross margin and operating margin for consistency across periods. Improving margins over time = 2pts, stable = 1pt, declining = 0pts. Fisher valued margin stability as proof of competitive moat and management quality." },
      { title: "3. Management Efficiency (20% weight)", detail: "Asset turnover trend (improving = 2pts), revenue per employee growth (2pts), SG&A as % of revenue declining (2pts). Fisher believed great management shows in operational efficiency metrics over time." },
      { title: "4. Fisher Valuation (15% weight)", detail: "P/S ratio trend vs historical (below historical P/S = undervalued). FCF yield >10% (3pts), >5% (2pts), >0% (1pt). Fisher accepted high P/Es for great growers but wanted FCF to eventually justify the multiple." },
      { title: "5. Insider Activity (5% weight)", detail: "Net buy/sell ratio of corporate insiders. Fisher's scuttlebutt approach — management buying their own stock confirms their private assessment of prospects." },
      { title: "6. News Sentiment (5% weight)", detail: "Positive product launches, R&D breakthroughs, new market entries score high. Fisher cared about competitive developments, not macro news." },
    ],
    keyMetrics: [
      { name: "R&D / Revenue", threshold: "3–15% = optimal", weight: "High", description: "Fisher's hallmark metric — consistent R&D investment builds tomorrow's competitive advantage." },
      { name: "Revenue Growth Trend", threshold: "> 10% sustained", weight: "High", description: "Fisher sought companies that could sustain above-average growth for decades." },
      { name: "Operating Margin Stability", threshold: "Stable or expanding", weight: "High", description: "Stable margins prove management quality and competitive pricing power." },
      { name: "Asset Turnover Trend", threshold: "Improving over time", weight: "Medium", description: "Improving asset utilisation shows management is leveraging the business model efficiently." },
      { name: "FCF Yield", threshold: "> 5%", weight: "Medium", description: "Eventually growth must convert to real cash — FCF yield validates the growth story." },
      { name: "SG&A / Revenue", threshold: "Declining over time", weight: "Medium", description: "Falling overhead ratio signals operational leverage — Fisher loved scalable businesses." },
    ],
    dataInputs: ["Financial Line Items (10 periods)", "Market Cap", "Insider Trades (last 90 days)", "Company News (last 90 days)"],
    signalRule: "Composite score ≥ 7.5/10 → Bullish. ≤ 4.5 → Bearish. Between → Neutral. LLM applies Fisher's 15-point 'scuttlebutt' checklist including management quality and R&D pipeline.",
    llmEnhanced: true,
  },

  rakesh_jhunjhunwala: {
    philosophy: "India is a multi-decade growth story. Back high-quality domestic consumption and infrastructure businesses with strong fundamentals at reasonable valuations — hold with conviction through volatility.",
    approach: "Five quantitative modules: profitability (max 8 pts), growth (max 7 pts), balance sheet (max 4 pts), cash flow (max 3 pts), management (max 2 pts). Total max 24 pts. A quality overlay can upgrade borderline neutral cases. LLM applies macro-growth lens.",
    steps: [
      { title: "1. Profitability (max 8 pts)", detail: "ROE >20% = 3pts, >15% = 2pts, >10% = 1pt. Operating margin >20% = 3pts, >15% = 2pts, >10% = 1pt. ROIC >15% = 2pts. Jhunjhunwala demanded exceptional profitability as proof of competitive strength." },
      { title: "2. Growth (max 7 pts)", detail: "Revenue growth >20% = 3pts, >10% = 2pts, >5% = 1pt. EPS growth >20% = 3pts, >10% = 2pts, >5% = 1pt. Book value growth bonus = 1pt. Jhunjhunwala sought companies riding India's structural growth trends." },
      { title: "3. Balance Sheet (max 4 pts)", detail: "D/E <0.5 = 2pts, <1.0 = 1pt. Current ratio >1.5 = 1pt. Interest coverage >3× = 1pt. Strong balance sheets survive volatility that shakes out weaker competitors." },
      { title: "4. Cash Flow (max 3 pts)", detail: "Positive FCF = 1pt. FCF growing over periods = 1pt. FCF/Net Income >0.8 = 1pt (earnings quality). Jhunjhunwala distrusted accounting earnings — real cash flow was the truth." },
      { title: "5. Management Actions (max 2 pts)", detail: "Share buybacks or consistent dividend growth = 1pt. No significant equity dilution = 1pt. Reflects management's capital allocation discipline and shareholder alignment." },
      { title: "6. Quality Overlay & Margin of Safety", detail: "Intrinsic value via DCF. Margin of safety ≥30% triggers direct bullish upgrade. Quality score (0–1) used to break ties: quality ≥0.7 + score ≥60% → bullish." },
    ],
    keyMetrics: [
      { name: "ROE", threshold: "> 20% = excellent", weight: "High", description: "Jhunjhunwala's primary quality screen — top businesses earn exceptional equity returns." },
      { name: "Revenue Growth", threshold: "> 20% = strong", weight: "High", description: "Structural growth tailwinds — Jhunjhunwala targeted companies riding India's rise." },
      { name: "Operating Margin", threshold: "> 20% = strong", weight: "High", description: "Wide operating margins signal pricing power and a defensible business model." },
      { name: "Margin of Safety (DCF)", threshold: "> 30%", weight: "High", description: "Jhunjhunwala wanted quality at a meaningful discount — patience was his edge." },
      { name: "Debt / Equity", threshold: "< 0.5", weight: "Medium", description: "Low leverage ensures the company survives macro downturns common in emerging markets." },
      { name: "FCF / Net Income", threshold: "> 80%", weight: "Medium", description: "High FCF conversion validates reported earnings — critical in emerging market accounting." },
    ],
    dataInputs: ["Financial Metrics (5 TTM periods)", "Financial Line Items (8 periods)", "Market Cap"],
    signalRule: "Score ≥ 70% of 24 (≥17 pts) AND/OR margin of safety ≥30% → Bullish. Score ≤ 30% (≤7 pts) OR margin of safety ≤−30% → Bearish. Quality overlay may upgrade borderline cases.",
    llmEnhanced: true,
  },

  stanley_druckenmiller: {
    philosophy: "First and foremost, don't lose. Preservation of capital is key — but when you have conviction, bet big. Macro conditions set the stage; earnings momentum and price action seal the trade.",
    approach: "Five weighted modules: growth & price momentum (35%), risk/reward (20%), valuation (20%), news sentiment (15%), insider activity (10%). ≥ 7.5/10 = bullish. Pure momentum and macro overlay — no traditional value investing.",
    steps: [
      { title: "1. Growth & Momentum (35% weight)", detail: "Revenue growth: >25% = 3pts, >15% = 2pts, >5% = 1pt. EPS growth: same scale. 6-month price momentum: >50% = 3pts, >20% = 2pts, positive = 1pt. Druckenmiller follows earnings and price momentum — not value alone." },
      { title: "2. Risk / Reward (20% weight)", detail: "Analyses asymmetry: upside potential relative to downside risk. Checks beta, drawdown history, and earnings volatility. A 3:1 risk/reward ratio is Druckenmiller's minimum bar for any position. High-quality risk metrics score 5–8/10." },
      { title: "3. Valuation (20% weight)", detail: "FCF yield, P/S vs history, EV/Revenue trend. Druckenmiller is not a value investor but avoids extreme overvaluation. Reasonable valuation with strong momentum is the ideal setup." },
      { title: "4. News Sentiment (15% weight)", detail: "Positive earnings surprises, upgrades, new catalyst headlines score highest. Druckenmiller is a macro trader — he looks for positive catalysts that can accelerate momentum." },
      { title: "5. Insider Activity (10% weight)", detail: "Insider buy cluster = strong alignment signal. Buy ratio >70% of transactions = 8pts, >50% = 7pts. Druckenmiller uses insider buying as a confirmation signal, not a primary one." },
    ],
    keyMetrics: [
      { name: "Price Momentum (6-month)", threshold: "> 20% return", weight: "High", description: "Druckenmiller's cornerstone signal — stocks in momentum continue moving in that direction." },
      { name: "Revenue Growth", threshold: "> 25% = strong", weight: "High", description: "Top-line acceleration validates the macro growth thesis behind the trade." },
      { name: "EPS Momentum", threshold: "> 25% = strong", weight: "High", description: "Earnings acceleration drives institutional buying and price momentum." },
      { name: "Risk / Reward Ratio", threshold: "> 3:1", weight: "High", description: "Druckenmiller's minimum asymmetry requirement — big bets only on clearly skewed odds." },
      { name: "FCF Yield", threshold: "Reasonable vs sector", weight: "Medium", description: "Avoids extreme overvaluation but accepts high multiples for quality momentum." },
      { name: "Insider Buy Ratio", threshold: "> 70% buys", weight: "Low", description: "Confirmation signal — insiders buying validates the external momentum thesis." },
    ],
    dataInputs: ["Financial Line Items (5 annual periods)", "Financial Metrics (5 periods)", "Price Data", "Market Cap", "Insider Trades (last 90 days)", "Company News (last 90 days)"],
    signalRule: "Composite weighted score ≥ 7.5/10 → Bullish. ≤ 4.5 → Bearish. Between → Neutral. LLM applies Druckenmiller's macro overlay: liquidity conditions, sector rotation, and asymmetric bet sizing.",
    llmEnhanced: true,
  },

  growth_analyst: {
    philosophy: "Growth is the engine of long-term equity value creation. Companies that consistently grow revenue, earnings, and margins while maintaining financial health deserve premium valuations.",
    approach: "Five weighted quantitative modules — no LLM. Growth trends (40%), valuation reasonableness (25%), margin trends (15%), insider conviction (10%), and financial health (10%). Weighted score > 0.6 = bullish.",
    steps: [
      { title: "1. Growth Trends (40% weight)", detail: "Revenue growth >20% = 0.4, >10% = 0.2 points. EPS growth >20% = 0.4, >10% = 0.2 points. FCF growth >15% = 0.2 points. Scores normalised to 0–1 range. The primary signal — growth quality and consistency." },
      { title: "2. Valuation (25% weight)", detail: "P/E vs earnings growth (PEG-style). P/S vs revenue growth. EV/EBITDA vs EBITDA growth. Rewards high growth even at premium multiples — but penalises extreme overvaluation relative to growth rate." },
      { title: "3. Margin Trends (15% weight)", detail: "Gross margin trend: improving = positive, declining = negative. Operating margin trend: same. Expanding margins on a growing revenue base signal compounding leverage — the hallmark of platform businesses." },
      { title: "4. Insider Conviction (10% weight)", detail: "Net insider buy score. Significant cluster buys = 0.9, single buys = 0.7, no activity = 0.5, net selling = 0.2. Management conviction via insider buys confirms the external growth thesis." },
      { title: "5. Financial Health (10% weight)", detail: "Current ratio, D/E, and interest coverage. Scores 0–1. Ensures the company's balance sheet can support the investments needed to sustain growth without financial distress." },
    ],
    keyMetrics: [
      { name: "Revenue Growth", threshold: "> 20% = excellent", weight: "High", description: "Primary growth signal — top-line expansion drives long-term earnings power." },
      { name: "EPS Growth", threshold: "> 20% = strong", weight: "High", description: "Earnings must grow to justify growth valuations and create shareholder value." },
      { name: "FCF Growth", threshold: "> 15%", weight: "High", description: "Validates that earnings growth converts to real cash — not just accounting gains." },
      { name: "Gross Margin Trend", threshold: "Expanding", weight: "Medium", description: "Rising gross margins signal scale benefits and strengthening competitive position." },
      { name: "Operating Margin Trend", threshold: "Expanding", weight: "Medium", description: "Operational leverage — earnings should grow faster than revenue as the business scales." },
      { name: "PEG-Style Ratio", threshold: "Growth > Valuation multiple", weight: "Medium", description: "Growth must justify valuation — extreme overvaluation relative to growth is penalised." },
    ],
    dataInputs: ["Financial Metrics (8+ TTM periods)", "Insider Trades", "Market Cap"],
    signalRule: "Weighted score > 0.6 → Bullish (confidence = |score − 0.5| × 200). Score < 0.4 → Bearish. Between → Neutral. Pure rules-based, no LLM.",
    llmEnhanced: false,
  },

  news_sentiment_analyst: {
    philosophy: "News flow is a leading indicator. Sustained positive coverage of earnings, products, and strategy precedes institutional buying. Negative news clusters often precede further price weakness.",
    approach: "Each recent news article is individually scored by the LLM as positive / negative / neutral with a confidence score. Majority vote across all articles determines the overall signal. Confidence scales with vote margin and individual article confidence.",
    steps: [
      { title: "1. News Retrieval", detail: "Fetches recent company news articles for the analysis period. Each article's title and content is prepared for LLM sentiment analysis." },
      { title: "2. Per-Article LLM Scoring", detail: "Claude reads each article and classifies it as 'positive', 'negative', or 'neutral' from an investor's perspective, providing a confidence score 0–100 for each classification." },
      { title: "3. Signal Aggregation", detail: "Counts bullish, bearish, and neutral article signals. Overall signal = majority vote. If bullish articles > bearish → bullish overall signal (and vice versa)." },
      { title: "4. Confidence Calculation", detail: "Confidence = weighted average of individual article confidence scores, scaled by the margin of the majority vote. A 10-0 bullish sweep = near 100% confidence; 6-4 bullish = lower confidence." },
    ],
    keyMetrics: [
      { name: "Bullish Article Count", threshold: "Majority of articles", weight: "High", description: "More positive articles than negative signals improving market perception." },
      { name: "Bearish Article Count", threshold: "Minority (bearish signal if majority)", weight: "High", description: "Negative coverage of lawsuits, earnings misses, or strategic failures." },
      { name: "Average Article Confidence", threshold: "> 70% = strong signal", weight: "Medium", description: "LLM's certainty about each article's sentiment — high confidence = clearer signal." },
      { name: "Vote Margin", threshold: "Large margin = high confidence", weight: "Medium", description: "A 9-1 bullish sweep is far stronger than a 6-4 split." },
    ],
    dataInputs: ["Company News (recent articles for the full analysis window)"],
    signalRule: "Bullish article count > Bearish → Bullish. Bearish > Bullish → Bearish. Equal → Neutral. Confidence reflects both vote margin and average article-level confidence score.",
    llmEnhanced: true,
  },

};

// Fallback for agents not explicitly defined
export const getAgentLogic = (agentKey: string): AgentLogic | null => {
  // Strip suffix (e.g. "warren_buffett_abc123" → "warren_buffett")
  const parts = agentKey.split('_');
  const lastPart = parts[parts.length - 1];
  const baseKey = (lastPart.length === 6 && /^[a-z0-9]+$/.test(lastPart))
    ? parts.slice(0, -1).join('_')
    : agentKey;

  // Also try removing _agent suffix
  const withoutAgent = baseKey.endsWith('_agent')
    ? baseKey.slice(0, -6)
    : baseKey;

  return AGENT_LOGIC[withoutAgent] || AGENT_LOGIC[baseKey] || null;
};
