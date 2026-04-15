import { useNodeContext } from '@/contexts/node-context';
import { useFlowContext } from '@/contexts/flow-context';
import { getDisplayName, getSignalColor } from './output-tab-utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Activity,
  CheckCircle2, XCircle, CircleDashed,
  BarChart2, Database, GitMerge, Shield, Scale,
  ArrowUp, ArrowDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricItem {
  name: string;
  value: string | null;
  threshold: string;
  passed: boolean | null;
}

type MetricsDetail = Record<string, MetricItem[]>;

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProcessTab({ className }: { className?: string }) {
  const { currentFlowId } = useFlowContext();
  const flowId = currentFlowId?.toString() || null;
  const { getAgentNodeDataForFlow, getOutputNodeDataForFlow } = useNodeContext();

  const agentData = getAgentNodeDataForFlow(flowId);
  const outputData = getOutputNodeDataForFlow(flowId);

  const tickers = outputData?.decisions ? Object.keys(outputData.decisions) : [];
  const allSignals: Record<string, Record<string, any>> = outputData?.analyst_signals || {};
  const tickerInputData: Record<string, any> = (outputData as any)?.ticker_input_data || {};

  const analystSignals = Object.entries(allSignals)
    .filter(([id]) => !id.includes('risk_management') && !id.includes('portfolio_management'));

  const committeeAnalysis: Record<string, any> = (outputData as any)?.committee_analysis || {};
  const decisions: Record<string, any> = outputData?.decisions || {};
  const hasCommittee = Object.keys(committeeAnalysis).length > 0;

  return (
    <div className={cn('h-full overflow-y-auto space-y-3 p-3', className)}>
      {/* Section 1: Stock Input */}
      <InputSection tickers={tickers} tickerInputData={tickerInputData} />

      {/* Section 2: Individual Agent Analysis */}
      {analystSignals.length > 0 ? (
        analystSignals.map(([agentId, signals]) => (
          <AgentCard
            key={agentId}
            agentId={agentId}
            signals={signals}
            tickers={tickers}
            agentNodeData={agentData[agentId]}
          />
        ))
      ) : (
        <EmptyState />
      )}

      {/* Section 3: Committee Synthesis */}
      {hasCommittee && (
        <CommitteeSynthesisSection
          tickers={tickers}
          committeeAnalysis={committeeAnalysis}
          decisions={decisions}
        />
      )}
    </div>
  );
}

// ─── Input Section ─────────────────────────────────────────────────────────────

function InputSection({ tickers, tickerInputData }: {
  tickers: string[];
  tickerInputData: Record<string, any>;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasInputData = Object.keys(tickerInputData).length > 0;

  return (
    <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-foreground">Stock Input</span>
          <span className="text-xs text-muted-foreground">({tickers.length} ticker{tickers.length !== 1 ? 's' : ''})</span>
          {hasInputData && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              Raw data loaded
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3">
          {tickers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tickers analyzed yet.</p>
          ) : !hasInputData ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tickers.map(ticker => (
                  <span key={ticker} className="font-mono text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {ticker}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Waiting for data collection...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickers.map(ticker => (
                <TickerRawDataCard
                  key={ticker}
                  ticker={ticker}
                  data={tickerInputData[ticker] || {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TickerRawDataCard({ ticker, data }: { ticker: string; data: any }) {
  const [expanded, setExpanded] = useState(true);

  const financialMetrics: Record<string, string> = data.financial_metrics || {};
  const priceData: Record<string, string> = data.price_data || {};
  const metricsPeriods: number = data.financial_metrics_periods ?? 0;
  const pricePeriods: number = data.price_periods ?? 0;
  const newsCount: number = data.news_count ?? 0;
  const insiderCount: number = data.insider_trade_count ?? 0;
  const marketCap: string = data.market_cap || '';

  const dataStats = [
    metricsPeriods > 0 && `${metricsPeriods} metric periods`,
    pricePeriods  > 0 && `${pricePeriods} price days`,
    newsCount     > 0 && `${newsCount} news`,
    insiderCount  > 0 && `${insiderCount} insider trades`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="border border-border/50 rounded-md overflow-hidden">
      {/* Ticker header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-blue-400">{ticker}</span>
          {marketCap && <span className="text-xs text-muted-foreground">{marketCap}</span>}
          {priceData['Latest Close'] && (
            <span className="text-xs font-mono text-foreground">{priceData['Latest Close']}</span>
          )}
          {priceData['Price Change'] && (
            <span className={cn(
              'text-[11px] font-mono',
              priceData['Price Change'].startsWith('▲') ? 'text-green-400' : 'text-red-400'
            )}>
              {priceData['Price Change']}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{dataStats}</span>
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Price data */}
          {Object.keys(priceData).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/80 mb-1.5">
                Price Data ({pricePeriods} days)
              </p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                {Object.entries(priceData).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground truncate">{k}:</span>
                    <span className={cn(
                      'font-mono shrink-0',
                      k === 'Price Change'
                        ? (v.startsWith('▲') ? 'text-green-400' : 'text-red-400')
                        : 'text-foreground'
                    )}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial metrics */}
          {Object.keys(financialMetrics).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/80 mb-1.5">
                Financial Metrics ({metricsPeriods} periods)
              </p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                {Object.entries(financialMetrics).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground truncate">{k}:</span>
                    <span className="font-mono text-foreground shrink-0">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data coverage summary */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/30">
            {[
              { label: 'News Articles', count: newsCount, color: 'text-yellow-400' },
              { label: 'Insider Trades', count: insiderCount, color: 'text-orange-400' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-1 text-[11px]">
                <span className={cn('font-semibold', color)}>{count}</span>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agentId, signals, tickers, agentNodeData }: {
  agentId: string;
  signals: Record<string, any>;
  tickers: string[];
  agentNodeData?: any;
}) {
  const [expanded, setExpanded] = useState(true);
  const displayName = getDisplayName(agentId);

  const allSignals = tickers.map(t => signals[t]?.signal?.toLowerCase()).filter(Boolean);
  const bullishCount = allSignals.filter(s => s === 'bullish').length;
  const bearishCount = allSignals.filter(s => s === 'bearish').length;
  const neutralCount = allSignals.filter(s => s === 'neutral').length;

  return (
    <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
      {/* Card header */}
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">{displayName}</span>
          <span className="text-xs text-muted-foreground">{allSignals.length} ticker{allSignals.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {bullishCount > 0 && <span className="text-xs text-green-400 font-medium">{bullishCount}↑</span>}
          {bearishCount > 0 && <span className="text-xs text-red-400 font-medium">{bearishCount}↓</span>}
          {neutralCount > 0 && <span className="text-xs text-gray-400 font-medium">{neutralCount}—</span>}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Per-ticker signals */}
          <div className="divide-y divide-border/50">
            {tickers.filter(t => signals[t]).map(ticker => (
              <TickerSignalRow key={ticker} ticker={ticker} signal={signals[ticker]} />
            ))}
          </div>

          {/* Process log */}
          {agentNodeData?.messages && agentNodeData.messages.length > 0 && (
            <ProcessLog messages={agentNodeData.messages} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ticker Signal Row ────────────────────────────────────────────────────────

function TickerSignalRow({ ticker, signal }: { ticker: string; signal: any }) {
  const [showDetail, setShowDetail] = useState(true);
  const signalType = signal.signal?.toUpperCase() || 'UNKNOWN';
  const confidence = signal.confidence || 0;
  const metricsDetail: MetricsDetail = signal.metrics_detail || {};
  const legacyMetrics = signal.metrics || {};
  const hasStructuredMetrics = Object.keys(metricsDetail).length > 0;

  const SignalIcon = signalType === 'BULLISH' ? TrendingUp : signalType === 'BEARISH' ? TrendingDown : Minus;
  const signalColor = getSignalColor(signalType);
  const barColor = signalType === 'BULLISH' ? 'bg-green-500' : signalType === 'BEARISH' ? 'bg-red-500' : 'bg-gray-400';

  // Compute metric pass stats
  const allMetrics = Object.values(metricsDetail).flat();
  const passCount = allMetrics.filter(m => m.passed === true).length;
  const failCount = allMetrics.filter(m => m.passed === false).length;
  const naCount = allMetrics.filter(m => m.passed === null).length;

  return (
    <div className="px-3 py-2">
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Ticker */}
        <span className="font-mono text-xs font-bold w-12 shrink-0">{ticker}</span>

        {/* Signal badge */}
        <div className={cn('flex items-center gap-1 w-20 shrink-0', signalColor)}>
          <SignalIcon className="h-3 w-3" />
          <span className="text-xs font-semibold">{signalType}</span>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">{confidence}%</span>
        </div>

        {/* Metric stats (if structured metrics available) */}
        {hasStructuredMetrics && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-green-400">✓{passCount}</span>
            <span className="text-[10px] text-red-400">✗{failCount}</span>
            {naCount > 0 && <span className="text-[10px] text-muted-foreground">?{naCount}</span>}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          {showDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded detail */}
      {showDetail && (
        <div className="mt-2 ml-12 space-y-3">
          {/* Structured metrics table */}
          {hasStructuredMetrics ? (
            <MetricsTable metricsDetail={metricsDetail} />
          ) : Object.keys(legacyMetrics).length > 0 ? (
            <LegacyMetrics metrics={legacyMetrics} />
          ) : null}

          {/* Reasoning text */}
          {signal.reasoning && typeof signal.reasoning === 'string' && (
            <div className="border-l-2 border-border pl-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reasoning</p>
              <p className="text-xs text-muted-foreground leading-relaxed italic">{signal.reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Metrics Table (structured) ───────────────────────────────────────────────

function MetricsTable({ metricsDetail }: { metricsDetail: MetricsDetail }) {
  return (
    <div className="bg-muted/20 rounded-md p-2 space-y-3">
      {Object.entries(metricsDetail).map(([groupName, metrics]) => (
        <MetricsGroup key={groupName} groupName={groupName} metrics={metrics} />
      ))}
    </div>
  );
}

function MetricsGroup({ groupName, metrics }: { groupName: string; metrics: MetricItem[] }) {
  if (!metrics || metrics.length === 0) return null;
  const passCount = metrics.filter(m => m.passed === true).length;
  const failCount = metrics.filter(m => m.passed === false).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{groupName}</p>
        <span className="text-[10px] text-green-400">✓{passCount}</span>
        <span className="text-[10px] text-red-400">✗{failCount}</span>
      </div>
      <div className="space-y-0.5">
        {metrics.map((m, i) => (
          <MetricRow key={i} metric={m} />
        ))}
      </div>
    </div>
  );
}

function MetricRow({ metric }: { metric: MetricItem }) {
  const isAvailable = metric.value !== null && metric.value !== undefined;

  return (
    <div className="flex items-center gap-2 text-[11px] py-0.5">
      {/* Status icon */}
      <div className="w-4 shrink-0 flex justify-center">
        {!isAvailable ? (
          <CircleDashed className="h-3 w-3 text-muted-foreground/40" />
        ) : metric.passed === true ? (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        ) : metric.passed === false ? (
          <XCircle className="h-3 w-3 text-red-400" />
        ) : (
          <CircleDashed className="h-3 w-3 text-muted-foreground/40" />
        )}
      </div>

      {/* Metric name */}
      <span className={cn(
        'w-52 shrink-0 truncate',
        isAvailable ? 'text-foreground/80' : 'text-muted-foreground/50'
      )}>
        {metric.name}
      </span>

      {/* Value */}
      <span className={cn(
        'font-mono flex-1',
        !isAvailable ? 'text-muted-foreground/40 italic' :
        metric.passed === true ? 'text-green-400' :
        metric.passed === false ? 'text-red-400' :
        'text-foreground'
      )}>
        {isAvailable ? metric.value : 'N/A'}
      </span>

      {/* Threshold */}
      <span className="text-[10px] text-muted-foreground/60 shrink-0 text-right max-w-24 truncate" title={metric.threshold}>
        {metric.threshold}
      </span>
    </div>
  );
}

// ─── Legacy Metrics (fallback) ────────────────────────────────────────────────

function LegacyMetrics({ metrics }: { metrics: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 gap-1 bg-muted/30 rounded p-2">
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-muted-foreground capitalize w-32 shrink-0 truncate">{key.replace(/_/g, ' ')}:</span>
          <span className="text-foreground font-mono text-[11px] break-all">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Process Log ──────────────────────────────────────────────────────────────

function ProcessLog({ messages }: { messages: any[] }) {
  const uniqueSteps = Array.from(
    new Map(messages.map((m: any) => [m.message, m])).values()
  ).slice(-12);

  return (
    <div className="px-3 py-2 bg-muted/20 border-t border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Process Log</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {uniqueSteps.map((step: any, i: number) => (
          <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="text-green-500">✓</span>
            {step.message}
          </span>
        ))}
      </div>
    </div>
  );
}


// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Activity className="h-8 w-8 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">Run an analysis to see the process monitor</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Metrics, signals, and reasoning will appear here</p>
    </div>
  );
}

// ─── Committee Synthesis Section ──────────────────────────────────────────────

const COMMITTEE_META: Record<string, { label: string; color: string; members: string }> = {
  value:            { label: 'Value',             color: 'text-blue-400',   members: 'Buffett · Graham · Munger · Pabrai' },
  growth:           { label: 'Growth',            color: 'text-purple-400', members: 'Lynch · Fisher · Wood · Jhunjhunwala' },
  contrarian_macro: { label: 'Macro/Contrarian',  color: 'text-orange-400', members: 'Burry · Ackman · Druckenmiller' },
};

const STOCK_TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  value:    { label: 'VALUE',    bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  growth:   { label: 'GROWTH',   bg: 'bg-purple-500/10', text: 'text-purple-400' },
  macro:    { label: 'MACRO',    bg: 'bg-orange-500/10', text: 'text-orange-400' },
  balanced: { label: 'BALANCED', bg: 'bg-gray-500/10',   text: 'text-gray-400' },
};

function SynthesisScoreBar({ score }: { score: number }) {
  const clamped = Math.max(-1, Math.min(1, score));
  const color   = clamped > 0.15 ? 'bg-green-500' : clamped < -0.15 ? 'bg-red-500' : 'bg-yellow-500';
  const pct     = Math.abs(clamped) * 50; // 0–50% width from centre
  return (
    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="absolute left-1/2 top-0 h-full w-px bg-border/80" />
      <div
        className={cn('absolute top-0 h-full rounded-full transition-all', color)}
        style={{
          left:  clamped >= 0 ? '50%' : `${50 - pct}%`,
          width: `${pct}%`,
        }}
      />
    </div>
  );
}

function CommitteeSynthesisSection({
  tickers,
  committeeAnalysis,
  decisions,
}: {
  tickers: string[];
  committeeAnalysis: Record<string, any>;
  decisions: Record<string, any>;
}) {
  const [expanded, setExpanded] = useState(true);
  const tickersWithData = tickers.filter(t => committeeAnalysis[t]);

  return (
    <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Committee Synthesis</span>
          <span className="text-xs text-muted-foreground">
            ({tickersWithData.length} ticker{tickersWithData.length !== 1 ? 's' : ''})
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border/50">
          {tickersWithData.map(ticker => (
            <TickerSynthesisCard
              key={ticker}
              ticker={ticker}
              analysis={committeeAnalysis[ticker]}
              decision={decisions[ticker]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TickerSynthesisCard({
  ticker, analysis, decision,
}: {
  ticker: string;
  analysis: any;
  decision: any;
}) {
  const [open, setOpen] = useState(true);
  if (!analysis) return null;

  const {
    stock_type, taleb_risk_gate, taleb_position_factor,
    damodaran_anchor, damodaran_confidence_adj,
    value_committee, growth_committee, contrarian_macro_committee,
    weighted_score, dominant_committee,
    technical_trend, overall_sentiment,
  } = analysis;

  const stockMeta  = STOCK_TYPE_META[stock_type]  ?? STOCK_TYPE_META.balanced;
  const ws         = weighted_score ?? 0;
  const wsColor    = ws > 0.15 ? 'text-green-400' : ws < -0.15 ? 'text-red-400' : 'text-yellow-400';
  const wsSign     = ws > 0 ? '+' : '';

  const talebColor =
    taleb_risk_gate === 'clear'   ? 'text-green-400' :
    taleb_risk_gate === 'caution' ? 'text-yellow-400' : 'text-red-400';

  const anchorColor =
    damodaran_anchor === 'undervalued' ? 'text-green-400' :
    damodaran_anchor === 'overvalued'  ? 'text-red-400'   : 'text-yellow-400';

  // committee weight ordering: dominant first
  const committeesRaw: [string, any][] = [
    ['value',            value_committee],
    ['growth',           growth_committee],
    ['contrarian_macro', contrarian_macro_committee],
  ];
  const committees: [string, any][] = [...committeesRaw].sort(
    ([aKey], [bKey]) => (aKey === dominant_committee ? -1 : bKey === dominant_committee ? 1 : 0)
  );

  return (
    <div>
      {/* Ticker row */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/10 hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-blue-400">{ticker}</span>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border',
            stockMeta.bg, stockMeta.text, 'border-current/30')}>
            {stockMeta.label}
          </span>
          <span className={cn('font-mono text-xs font-semibold', wsColor)}>
            {wsSign}{ws.toFixed(3)}
          </span>
          {decision && (
            <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
              decision.action === 'buy'  ? 'bg-green-500/10 text-green-400' :
              decision.action === 'sell' ? 'bg-red-500/10 text-red-400' :
                                           'bg-yellow-500/10 text-yellow-400')}>
              {decision.action} {decision.quantity > 0 ? `×${decision.quantity}` : ''}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
          : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 py-3 space-y-4 bg-muted/5">

          {/* ── Step 1: Stock Classification ──────────────────────── */}
          <SynthesisStep number={1} title="Stock Classification">
            <div className="flex items-start gap-6 flex-wrap">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Type detected</p>
                <span className={cn('text-xs font-bold', stockMeta.text)}>{stockMeta.label}</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Committee weights</p>
                <div className="flex items-center gap-2">
                  {committees.map(([key, c]) => (
                    <span key={key} className={cn(
                      'text-[10px] font-semibold',
                      COMMITTEE_META[key]?.color ?? 'text-foreground'
                    )}>
                      {COMMITTEE_META[key]?.label} {Math.round((c?.weight ?? 0) * 100)}%
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Context signals</p>
                <div className="flex items-center gap-3 text-[10px]">
                  <span>Tech: <span className={
                    technical_trend === 'bullish' ? 'text-green-400' :
                    technical_trend === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                  }>{technical_trend}</span></span>
                  <span>Sent: <span className={
                    overall_sentiment === 'bullish' ? 'text-green-400' :
                    overall_sentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                  }>{overall_sentiment}</span></span>
                </div>
              </div>
            </div>
          </SynthesisStep>

          {/* ── Step 2: Gate Checks ───────────────────────────────── */}
          <SynthesisStep number={2} title="Gate Checks">
            <div className="grid grid-cols-2 gap-3">
              {/* Taleb */}
              <div className="flex items-start gap-2 rounded border border-border/50 p-2 bg-muted/10">
                <Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Nassim Taleb — Risk Gate</p>
                  <p className={cn('text-xs font-semibold capitalize', talebColor)}>
                    {taleb_risk_gate}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Position factor: <span className="font-mono font-semibold text-foreground">{taleb_position_factor}×</span>
                    {taleb_position_factor < 1 && (
                      <span className="text-yellow-400"> ← size restricted</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {taleb_risk_gate === 'clear'
                      ? 'No tail-risk flags. Normal sizing.'
                      : taleb_risk_gate === 'caution'
                      ? 'Elevated risk. Reduced to 70% of normal.'
                      : 'Danger. Position capped at 30%.'}
                  </p>
                </div>
              </div>

              {/* Damodaran */}
              <div className="flex items-start gap-2 rounded border border-border/50 p-2 bg-muted/10">
                <Scale className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Aswath Damodaran — Valuation Anchor</p>
                  <p className={cn('text-xs font-semibold capitalize', anchorColor)}>
                    {damodaran_anchor}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Confidence adj: <span className="font-mono font-semibold text-foreground">{damodaran_confidence_adj}×</span>
                    {damodaran_confidence_adj > 1 && <span className="text-green-400"> ← boosted</span>}
                    {damodaran_confidence_adj < 1 && <span className="text-yellow-400"> ← discounted</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {damodaran_anchor === 'undervalued'
                      ? 'Trading below intrinsic value. Bullish signals amplified.'
                      : damodaran_anchor === 'overvalued'
                      ? 'Trading above intrinsic value. Bullish signals discounted.'
                      : 'Fair value range. No confidence adjustment.'}
                  </p>
                </div>
              </div>
            </div>
          </SynthesisStep>

          {/* ── Step 3: Committee Voting ──────────────────────────── */}
          <SynthesisStep number={3} title="Committee Voting">
            <div className="space-y-2.5">
              {committees.map(([key, c]) => {
                if (!c) return null;
                const meta      = COMMITTEE_META[key];
                const isDominant= key === dominant_committee;
                const agents: any[] = c.agents ?? [];
                const weight    = Math.round((c.weight ?? 0) * 100);
                const score     = c.score ?? 0;
                const scoreSign = score > 0 ? '+' : '';

                return (
                  <div key={key} className={cn(
                    'rounded border p-2.5 transition-all',
                    isDominant ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-muted/5'
                  )}>
                    {/* Committee header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-semibold', meta?.color)}>{meta?.label}</span>
                        {isDominant && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-primary border border-primary/40 px-1 rounded">
                            dominant
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>weight <span className="font-mono font-semibold text-foreground">{weight}%</span></span>
                        <span>contribution <span className={cn('font-mono font-semibold',
                          score > 0.15 ? 'text-green-400' : score < -0.15 ? 'text-red-400' : 'text-yellow-400')}>
                          {scoreSign}{(score * (c.weight ?? 0)).toFixed(3)}
                        </span></span>
                      </div>
                    </div>

                    {/* Score bar */}
                    <SynthesisScoreBar score={score} />

                    {/* Vote counts + raw score */}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                      <span className="text-green-400 font-semibold">{c.bullish ?? 0} bullish</span>
                      <span className="text-yellow-400">{c.neutral ?? 0} neutral</span>
                      <span className="text-red-400">{c.bearish ?? 0} bearish</span>
                      <span className="ml-auto font-mono text-muted-foreground">
                        raw score: <span className={cn('font-semibold',
                          score > 0.15 ? 'text-green-400' : score < -0.15 ? 'text-red-400' : 'text-yellow-400')}>
                          {scoreSign}{score.toFixed(3)}
                        </span>
                      </span>
                    </div>

                    {/* Agent details */}
                    {agents.length > 0 ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 pt-1.5 border-t border-border/30">
                        {agents.map((a: any) => (
                          <div key={a.name} className="flex items-center gap-1 text-[10px]">
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                              a.signal === 'bullish' ? 'bg-green-500' :
                              a.signal === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'
                            )} />
                            <span className="text-muted-foreground capitalize">
                              {a.name.replace(/_/g, ' ')}
                            </span>
                            <span className="text-muted-foreground/50 font-mono">{a.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/40 italic mt-1.5">
                        No {meta?.label} agents connected to this flow
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </SynthesisStep>

          {/* ── Step 4: Score Calculation ─────────────────────────── */}
          <SynthesisStep number={4} title="Weighted Score Calculation">
            <div className="font-mono text-xs space-y-1 bg-muted/20 rounded p-2.5">
              {committees.map(([key, c]) => {
                if (!c || !c.agents?.length) return null;
                const meta   = COMMITTEE_META[key];
                const score  = c.score ?? 0;
                const weight = c.weight ?? 0;
                const contrib= score * weight;
                const sign   = score > 0 ? '+' : '';
                const cSign  = contrib > 0 ? '+' : '';
                return (
                  <div key={key} className="flex items-center gap-2 text-[11px]">
                    <span className={cn('w-28 shrink-0', meta?.color)}>{meta?.label}</span>
                    <span className="text-muted-foreground">
                      {sign}{score.toFixed(3)} × {Math.round(weight * 100)}%
                    </span>
                    <span className="text-muted-foreground">=</span>
                    <span className={cn('font-semibold',
                      contrib > 0.05 ? 'text-green-400' : contrib < -0.05 ? 'text-red-400' : 'text-yellow-400')}>
                      {cSign}{contrib.toFixed(3)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-[11px] pt-1.5 border-t border-border/50">
                <span className="w-28 shrink-0 font-semibold text-foreground">Composite</span>
                <span className="text-muted-foreground">= </span>
                <span className={cn('font-bold text-sm', wsColor)}>
                  {wsSign}{ws.toFixed(3)}
                </span>
                <SynthesisScoreBar score={ws} />
              </div>
            </div>
          </SynthesisStep>

          {/* ── Step 5: Final Decision ─────────────────────────────── */}
          {decision && (
            <SynthesisStep number={5} title="Portfolio Decision">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {(decision.action === 'buy' || decision.action === 'long')
                    ? <ArrowUp className="h-4 w-4 text-green-500" />
                    : (decision.action === 'sell' || decision.action === 'short')
                    ? <ArrowDown className="h-4 w-4 text-red-500" />
                    : <Minus className="h-4 w-4 text-yellow-500" />}
                  <span className={cn('text-sm font-bold uppercase',
                    (decision.action === 'buy' || decision.action === 'long') ? 'text-green-400' :
                    (decision.action === 'sell' || decision.action === 'short') ? 'text-red-400' : 'text-yellow-400')}>
                    {decision.action}
                  </span>
                  {decision.quantity > 0 && (
                    <span className="text-xs font-mono text-foreground">× {decision.quantity} shares</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">confidence</span>
                  <span className={cn('text-xs font-mono font-semibold',
                    decision.confidence >= 70 ? 'text-green-400' :
                    decision.confidence >= 40 ? 'text-yellow-400' : 'text-muted-foreground')}>
                    {decision.confidence}%
                  </span>
                </div>
              </div>
              {decision.reasoning && (
                <div className="mt-2 text-[11px] text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-2">
                  {decision.reasoning}
                </div>
              )}
            </SynthesisStep>
          )}

        </div>
      )}
    </div>
  );
}

function SynthesisStep({
  number, title, children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      {/* Step number */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-[9px] font-bold text-primary">{number}</span>
        </div>
        <div className="flex-1 w-px bg-border/40 mt-1" />
      </div>
      {/* Content */}
      <div className="flex-1 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}
