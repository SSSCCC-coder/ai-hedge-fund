import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AGENT_LOGIC, AgentLogic } from '@/data/agent-logic';
import { AGENT_LOGIC_ZH } from '@/data/agent-logic-zh';
import { useLanguage } from '@/hooks/use-language';
import {
  BookOpen, Brain, CheckCircle2, ChevronRight,
  Database, Sparkles, Zap, Search,
} from 'lucide-react';

const WEIGHT_COLOR: Record<string, string> = {
  High:   'bg-red-500/10 text-red-400 border-red-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

// Display names mapped from logic keys
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  warren_buffett:         'Warren Buffett',
  ben_graham:             'Ben Graham',
  charlie_munger:         'Charlie Munger',
  peter_lynch:            'Peter Lynch',
  phil_fisher:            'Phil Fisher',
  cathie_wood:            'Cathie Wood',
  michael_burry:          'Michael Burry',
  bill_ackman:            'Bill Ackman',
  mohnish_pabrai:         'Mohnish Pabrai',
  nassim_taleb:           'Nassim Taleb',
  aswath_damodaran:       'Aswath Damodaran',
  rakesh_jhunjhunwala:    'Rakesh Jhunjhunwala',
  stanley_druckenmiller:  'Stanley Druckenmiller',
  fundamentals_analyst:   'Fundamentals Analyst',
  technical_analyst:      'Technical Analyst',
  valuation_analyst:      'Valuation Analyst',
  growth_analyst:         'Growth Analyst',
  sentiment_analyst:      'Sentiment Analyst',
  news_sentiment_analyst: 'News Sentiment Analyst',
};

export function LogicTab({ className }: { className?: string }) {
  const agents = Object.keys(AGENT_LOGIC);
  const [selected, setSelected] = useState<string>(agents[0] || '');
  const [search, setSearch] = useState('');
  const { language, setLanguage } = useLanguage();

  const filtered = agents.filter(key =>
    (AGENT_DISPLAY_NAMES[key] || key).toLowerCase().includes(search.toLowerCase())
  );

  const logicSource = language === 'chinese' ? AGENT_LOGIC_ZH : AGENT_LOGIC;
  const logic: AgentLogic | null = logicSource[selected] || AGENT_LOGIC[selected] || null;
  const displayName = AGENT_DISPLAY_NAMES[selected] || selected;

  return (
    <div className={cn('h-full flex gap-0 overflow-hidden', className)}>

      {/* ── Left sidebar: agent list ── */}
      <div className="w-48 shrink-0 border-r border-border flex flex-col">
        {/* Search + language toggle */}
        <div className="p-2 border-b border-border flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 border border-border">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              placeholder="Search agents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="inline-flex rounded border border-border overflow-hidden self-start">
            <button
              className={cn(
                "px-2 py-0.5 text-[11px] transition-colors",
                language === 'english'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
              onClick={() => setLanguage('english')}
            >EN</button>
            <button
              className={cn(
                "px-2 py-0.5 text-[11px] transition-colors border-l border-border",
                language === 'chinese'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
              onClick={() => setLanguage('chinese')}
            >中文</button>
          </div>
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map(key => {
            const logic = AGENT_LOGIC[key];
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={cn(
                  'w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors',
                  selected === key
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent/30 border-l-2 border-transparent'
                )}
              >
                <span className="text-xs font-medium truncate">{AGENT_DISPLAY_NAMES[key] || key}</span>
                {logic.llmEnhanced && (
                  <span className="text-[10px] text-purple-400 flex items-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" /> LLM
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      {logic ? (
        <div className="flex-1 overflow-y-auto">
          {/* Agent header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3 border-b border-border bg-card/95 backdrop-blur">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
              <Brain className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{displayName}</p>
            </div>
            {logic.llmEnhanced && (
              <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <Sparkles className="h-3 w-3" />
                LLM-enhanced
              </div>
            )}
          </div>

          {/* 3-column body */}
          <div className="p-5 grid grid-cols-3 gap-5">

            {/* Col 1: Philosophy + Approach + Data + Signal */}
            <div className="space-y-4">
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Philosophy
                </p>
                <p className="text-xs text-foreground/90 leading-relaxed italic">
                  "{logic.philosophy}"
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Approach
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{logic.approach}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Database className="h-3 w-3" /> Data Inputs
                </p>
                <div className="space-y-1">
                  {logic.dataInputs.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <span className="text-primary mt-0.5 shrink-0">·</span>
                      {d}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/20 border border-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Signal Rule
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{logic.signalRule}</p>
              </div>
            </div>

            {/* Col 2: Analysis Steps */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" /> Analysis Steps
              </p>
              <div className="space-y-2">
                {logic.steps.map((step, i) => (
                  <div key={i} className="flex gap-3 rounded-md bg-muted/20 p-3">
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {step.title.replace(/^\d+\.\s*/, '')}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Col 3: Key Metrics */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" /> Key Metrics & Thresholds
              </p>
              <div className="space-y-2">
                {logic.keyMetrics.map((m, i) => (
                  <div key={i} className="rounded-md bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0',
                        WEIGHT_COLOR[m.weight]
                      )}>
                        {m.weight}
                      </span>
                      <span className="text-xs font-medium text-foreground">{m.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {m.threshold}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Brain className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select an agent to view its evaluation logic</p>
          </div>
        </div>
      )}
    </div>
  );
}
