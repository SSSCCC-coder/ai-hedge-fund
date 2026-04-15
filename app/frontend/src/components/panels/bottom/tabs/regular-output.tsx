import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus, Shield, TrendingUp, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDisplayName, getStatusIcon } from './output-tab-utils';
import { ReasoningContent } from './reasoning-content';

// ── Generic helpers ───────────────────────────────────────────────────────

type ActionType = 'long' | 'short' | 'hold' | 'buy' | 'sell' | 'cover' | string;
type SignalType  = 'bullish' | 'bearish' | 'neutral' | string;

function ActionIcon({ action }: { action: ActionType }) {
  const a = action?.toLowerCase();
  if (a === 'long' || a === 'buy')   return <ArrowUp   className="h-3.5 w-3.5 text-green-500" />;
  if (a === 'short' || a === 'sell') return <ArrowDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-yellow-500" />;
}

function ActionBadge({ action }: { action: ActionType }) {
  const a = action?.toLowerCase();
  const cls =
    (a === 'long' || a === 'buy')   ? 'bg-green-500/10 text-green-400 border-green-500/20' :
    (a === 'short' || a === 'sell') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border', cls)}>
      <ActionIcon action={action} />
      {action?.toUpperCase() || '—'}
    </span>
  );
}

function SignalBadge({ signal }: { signal: SignalType }) {
  const s = signal?.toLowerCase();
  const variant = s === 'bullish' ? 'success' : s === 'bearish' ? 'destructive' : 'outline';
  return <Badge variant={variant as any} className="text-xs">{signal || 'neutral'}</Badge>;
}

function ConfidenceBadge({ value }: { value: number }) {
  const variant = value >= 70 ? 'success' : value >= 40 ? 'warning' : 'outline';
  return (
    <Badge variant={variant as any} className="text-xs font-mono">
      {Number(value?.toFixed(1) ?? 0)}%
    </Badge>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────

function ProgressSection({ sortedAgents }: { sortedAgents: [string, any][] }) {
  if (sortedAgents.length === 0) return null;
  return (
    <Card className="bg-transparent mb-4">
      <CardHeader className="pb-2"><CardTitle className="text-base">Progress</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedAgents.map(([agentId, data]) => {
            const { icon: StatusIcon, color } = getStatusIcon(data.status);
            return (
              <div key={agentId} className="flex items-center gap-2 text-xs">
                <StatusIcon className={cn('h-3.5 w-3.5 flex-shrink-0', color)} />
                <span className="font-medium">{getDisplayName(agentId)}</span>
                {data.ticker && <span className="text-muted-foreground">[{data.ticker}]</span>}
                <span className={cn('flex-1 truncate', color)}>{data.message || data.status}</span>
                {data.timestamp && (
                  <span className="text-muted-foreground shrink-0">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Summary ───────────────────────────────────────────────────────────────

function SummarySection({ outputData }: { outputData: any }) {
  if (!outputData?.decisions) return null;
  const tickers = Object.keys(outputData.decisions);
  const prices  = outputData.current_prices || {};
  return (
    <Card className="bg-transparent mb-4">
      <CardHeader className="pb-2"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Ticker</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="pr-6">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickers.map(ticker => {
              const d = outputData.decisions[ticker];
              const p = prices[ticker];
              return (
                <TableRow key={ticker}>
                  <TableCell className="font-mono font-semibold pl-6">{ticker}</TableCell>
                  <TableCell className="font-mono text-xs">{p != null ? `$${Number(p).toFixed(2)}` : '—'}</TableCell>
                  <TableCell><ActionBadge action={d.action} /></TableCell>
                  <TableCell className="font-mono text-xs">{d.quantity ?? 0}</TableCell>
                  <TableCell className="pr-6"><ConfidenceBadge value={d.confidence ?? 0} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Committee Breakdown ───────────────────────────────────────────────────

const COMMITTEE_LABELS: Record<string, string> = {
  value:            'Value',
  growth:           'Growth',
  contrarian_macro: 'Macro / Contrarian',
};

const STOCK_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  value:    { label: 'VALUE',    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  growth:   { label: 'GROWTH',   cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  macro:    { label: 'MACRO',    cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  balanced: { label: 'BALANCED', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
};

const TALEB_CONFIG: Record<string, { label: string; cls: string }> = {
  clear:   { label: 'Risk: Clear',   cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
  caution: { label: 'Risk: Caution', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  danger:  { label: 'Risk: Danger',  cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

const ANCHOR_CONFIG: Record<string, { label: string; cls: string }> = {
  undervalued: { label: 'Undervalued ↑', cls: 'text-green-400' },
  fair:        { label: 'Fair Value =',  cls: 'text-yellow-400' },
  overvalued:  { label: 'Overvalued ↓',  cls: 'text-red-400' },
};

function ScoreBar({ score }: { score: number }) {
  // score in [-1, +1] → position 0–100%
  const pct   = Math.round(((score + 1) / 2) * 100);
  const color = score > 0.15 ? 'bg-green-500' : score < -0.15 ? 'bg-red-500' : 'bg-yellow-500';
  return (
    <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
      {/* centre line */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
      <div
        className={cn('absolute top-0 h-full rounded-full', color)}
        style={{
          left:  score >= 0 ? '50%' : `${pct}%`,
          width: `${Math.abs(pct - 50)}%`,
        }}
      />
    </div>
  );
}

function CommitteeCard({
  commKey, data, isDominant,
}: { commKey: string; data: any; isDominant: boolean }) {
  if (!data) return null;
  const label = COMMITTEE_LABELS[commKey] || commKey;
  const weight = Math.round((data.weight ?? 0) * 100);
  const score  = data.score ?? 0;
  const agents: any[] = data.agents ?? [];

  return (
    <div className={cn(
      'rounded-md border p-2.5 flex flex-col gap-1.5 transition-all',
      isDominant ? 'border-primary/60 bg-primary/5' : 'border-border bg-muted/10'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
        <div className="flex items-center gap-1.5">
          {isDominant && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-primary">
              Dominant
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{weight}% weight</span>
        </div>
      </div>

      <ScoreBar score={score} />

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="text-green-400 font-semibold">{data.bullish ?? 0}↑</span>
        <span className="text-yellow-400">{data.neutral ?? 0}→</span>
        <span className="text-red-400">{data.bearish ?? 0}↓</span>
        <span className="ml-auto font-mono font-semibold text-xs">
          {score > 0 ? '+' : ''}{score.toFixed(2)}
        </span>
      </div>

      {agents.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-border/50 pt-1.5 mt-0.5">
          {agents.map((a: any) => (
            <div key={a.name} className="flex items-center gap-1.5 text-[10px]">
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                a.signal === 'bullish' ? 'bg-green-500' :
                a.signal === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'
              )} />
              <span className="text-muted-foreground capitalize">
                {a.name.replace(/_/g, ' ')}
              </span>
              <span className="ml-auto font-mono text-muted-foreground/70">
                {a.confidence}%
              </span>
            </div>
          ))}
        </div>
      )}

      {agents.length === 0 && (
        <p className="text-[10px] text-muted-foreground/50 italic">No agents connected</p>
      )}
    </div>
  );
}

function CommitteeBreakdown({ analysis }: { analysis: any }) {
  if (!analysis) return null;

  const {
    stock_type, taleb_risk_gate, taleb_position_factor,
    damodaran_anchor, damodaran_confidence_adj,
    value_committee, growth_committee, contrarian_macro_committee,
    weighted_score, dominant_committee,
    technical_trend, overall_sentiment,
  } = analysis;

  const stockCfg  = STOCK_TYPE_CONFIG[stock_type]  ?? STOCK_TYPE_CONFIG.balanced;
  const talebCfg  = TALEB_CONFIG[taleb_risk_gate]   ?? TALEB_CONFIG.clear;
  const anchorCfg = ANCHOR_CONFIG[damodaran_anchor] ?? ANCHOR_CONFIG.fair;

  const scoreColor =
    weighted_score > 0.15  ? 'text-green-400' :
    weighted_score < -0.15 ? 'text-red-400'   : 'text-yellow-400';

  return (
    <div className="rounded-md border border-border/60 bg-muted/5 p-3 space-y-3">
      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Stock type */}
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', stockCfg.cls)}>
          {stockCfg.label}
        </span>

        {/* Taleb gate */}
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', talebCfg.cls)}>
            {talebCfg.label}
          </span>
          <span className="text-[10px] text-muted-foreground">({taleb_position_factor}×)</span>
        </div>

        {/* Damodaran anchor */}
        <div className="flex items-center gap-1">
          <Scale className="h-3 w-3 text-muted-foreground" />
          <span className={cn('text-[10px] font-semibold', anchorCfg.cls)}>
            {anchorCfg.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            (conf ×{damodaran_confidence_adj})
          </span>
        </div>

        {/* Functional signals */}
        <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>Tech: <span className={cn(
            technical_trend === 'bullish' ? 'text-green-400' :
            technical_trend === 'bearish' ? 'text-red-400' : 'text-yellow-400'
          )}>{technical_trend}</span></span>
          <span>Sent: <span className={cn(
            overall_sentiment === 'bullish' ? 'text-green-400' :
            overall_sentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'
          )}>{overall_sentiment}</span></span>
        </div>
      </div>

      {/* ── Committee cards ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <CommitteeCard commKey="value"            data={value_committee}            isDominant={dominant_committee === 'value'} />
        <CommitteeCard commKey="growth"           data={growth_committee}           isDominant={dominant_committee === 'growth'} />
        <CommitteeCard commKey="contrarian_macro" data={contrarian_macro_committee} isDominant={dominant_committee === 'contrarian_macro'} />
      </div>

      {/* ── Weighted score footer ──────────────────────────────── */}
      <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
        <span className="text-muted-foreground">
          Dominant: <span className="text-foreground capitalize">
            {dominant_committee?.replace(/_/g, ' ')}
          </span>
        </span>
        <span className="text-muted-foreground">
          Weighted Score:{' '}
          <span className={cn('font-mono font-semibold', scoreColor)}>
            {weighted_score > 0 ? '+' : ''}{weighted_score?.toFixed(3)}
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Analysis section ──────────────────────────────────────────────────────

function AnalysisResultsSection({
  outputData,
  committeeAnalysis,
}: {
  outputData: any;
  committeeAnalysis: Record<string, any>;
}) {
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const tickers = outputData?.decisions ? Object.keys(outputData.decisions) : [];

  useEffect(() => {
    if (tickers.length > 0 && !selectedTicker) setSelectedTicker(tickers[0]);
  }, [tickers, selectedTicker]);

  if (!outputData || tickers.length === 0) return null;

  return (
    <Card className="bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Analyst Signals</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTicker} onValueChange={setSelectedTicker} className="w-full">
          <TabsList className="flex space-x-1 bg-muted p-1 rounded-lg mb-4">
            {tickers.map(ticker => (
              <TabsTrigger
                key={ticker} value={ticker}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors
                  data-[state=active]:active-bg data-[state=active]:text-blue-500 data-[state=active]:shadow-sm
                  text-primary hover:text-primary hover-bg"
              >
                {ticker}
              </TabsTrigger>
            ))}
          </TabsList>

          {tickers.map(ticker => {
            const decision  = outputData.decisions[ticker];
            const ca        = committeeAnalysis?.[ticker];
            const agents    = (Object.entries(outputData.analyst_signals || {}) as [string, any][])
              .filter(([agent, signals]) => ticker in signals && !agent.includes('risk_management'))
              .sort(([a], [b]) => a.localeCompare(b));

            return (
              <TabsContent key={ticker} value={ticker} className="space-y-4 mt-0">

                {/* Committee breakdown */}
                {ca && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Committee Framework
                    </div>
                    <CommitteeBreakdown analysis={ca} />
                  </div>
                )}

                {/* Agent signal table */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Individual Signals
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-44">Agent</TableHead>
                        <TableHead className="w-28">Signal</TableHead>
                        <TableHead className="w-28">Confidence</TableHead>
                        <TableHead>Reasoning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map(([agent, signals]) => {
                        const s = signals[ticker];
                        return (
                          <TableRow key={agent}>
                            <TableCell className="font-medium text-xs align-top pt-3">
                              {getDisplayName(agent)}
                            </TableCell>
                            <TableCell className="align-top pt-3">
                              <SignalBadge signal={s.signal?.toLowerCase()} />
                            </TableCell>
                            <TableCell className="align-top pt-3">
                              <ConfidenceBadge value={s.confidence ?? 0} />
                            </TableCell>
                            <TableCell className="max-w-md align-top pt-3">
                              <ReasoningContent content={s.reasoning} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Portfolio decision */}
                {decision && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Portfolio Decision
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Action</span>
                          <ActionBadge action={decision.action} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Quantity</span>
                          <span className="font-mono text-xs font-semibold">{decision.quantity ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confidence</span>
                          <ConfidenceBadge value={decision.confidence ?? 0} />
                        </div>
                      </div>
                      {decision.reasoning && (
                        <div className="mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
                          <ReasoningContent content={decision.reasoning} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export function RegularOutput({
  sortedAgents,
  outputData,
}: {
  sortedAgents: [string, any][];
  outputData: any;
}) {
  const committeeAnalysis: Record<string, any> = (outputData as any)?.committee_analysis ?? {};

  return (
    <>
      <ProgressSection sortedAgents={sortedAgents} />
      <SummarySection  outputData={outputData} />
      <AnalysisResultsSection outputData={outputData} committeeAnalysis={committeeAnalysis} />
    </>
  );
}
