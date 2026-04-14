import { getAgentLogic } from '@/data/agent-logic';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import {
  BookOpen, Brain, CheckCircle2, ChevronRight,
  Database, Sparkles, X, Zap
} from 'lucide-react';

interface AgentLogicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentKey: string;
  agentName: string;
}

const WEIGHT_COLOR: Record<string, string> = {
  High:   'bg-red-500/10 text-red-400 border-red-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function AgentLogicDialog({
  isOpen,
  onClose,
  agentKey,
  agentName,
}: AgentLogicDialogProps) {
  const logic = getAgentLogic(agentKey);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 flex flex-col',
          'bg-card border-t border-border shadow-2xl',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ height: '72vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{agentName}</p>
              <p className="text-[11px] text-muted-foreground">Evaluation Logic</p>
            </div>
            {logic?.llmEnhanced && (
              <div className="ml-2 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="h-3 w-3" />
                LLM-enhanced
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {logic ? (
            <div className="px-6 py-5 grid grid-cols-3 gap-6">

              {/* ── Column 1: Philosophy + Approach + Steps ── */}
              <div className="col-span-1 space-y-5">

                {/* Philosophy */}
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> Philosophy
                  </p>
                  <p className="text-xs text-foreground/90 leading-relaxed italic">
                    "{logic.philosophy}"
                  </p>
                </div>

                {/* Approach */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Approach
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{logic.approach}</p>
                </div>

                {/* Data Inputs */}
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

                {/* Signal Rule */}
                <div className="rounded-lg bg-muted/20 border border-border p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Signal Rule
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{logic.signalRule}</p>
                </div>
              </div>

              {/* ── Column 2: Analysis Steps ── */}
              <div className="col-span-1 space-y-3">
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

              {/* ── Column 3: Key Metrics ── */}
              <div className="col-span-1 space-y-3">
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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {m.threshold}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Brain className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Detailed logic for <strong>{agentName}</strong> is not yet documented.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
