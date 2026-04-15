import { type NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';

import { CardContent } from '@/components/ui/card';
import { useFlowContext } from '@/contexts/flow-context';
import { useLayoutContext } from '@/contexts/layout-context';
import { useOutputNodeConnection } from '@/hooks/use-output-node-connection';
import { type InvestmentReportNode } from '../types';
import { NodeShell } from './node-shell';
import { OutputNodeStatus } from './output-node-status';

export function InvestmentReportNode({
  data,
  selected,
  id,
  isConnectable,
}: NodeProps<InvestmentReportNode>) {
  const { currentFlowId } = useFlowContext();
  const { expandBottomPanel, setBottomPanelTab } = useLayoutContext();

  const flowId = currentFlowId?.toString() || null;
  const { isProcessing, isAnyAgentRunning, isOutputAvailable, isConnected } =
    useOutputNodeConnection(id);

  const status = isProcessing || isAnyAgentRunning ? 'IN_PROGRESS' : 'IDLE';

  const handleViewOutput = () => {
    expandBottomPanel();
    setBottomPanelTab('output');
  };

  return (
    <NodeShell
      id={id}
      selected={selected}
      isConnectable={isConnectable}
      icon={<FileText className="h-5 w-5" />}
      name={data.name || 'Investment Report'}
      description={data.description}
      hasRightHandle={false}
      status={status}
    >
      <CardContent className="p-0">
        <div className="border-t border-border p-3">
          <div className="flex flex-col gap-2">
            <div className="text-subtitle text-muted-foreground">Results</div>
            <OutputNodeStatus
              isProcessing={isProcessing}
              isAnyAgentRunning={isAnyAgentRunning}
              isOutputAvailable={isOutputAvailable}
              isConnected={isConnected}
              onViewOutput={handleViewOutput}
              availableText="View in Output Tab"
            />
          </div>
        </div>
      </CardContent>
    </NodeShell>
  );
}
