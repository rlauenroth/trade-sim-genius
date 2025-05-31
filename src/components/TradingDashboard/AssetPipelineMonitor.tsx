
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Bot } from 'lucide-react';
import AssetPipelineHeader from './AssetPipeline/AssetPipelineHeader';
import AssetPipelineEmpty from './AssetPipeline/AssetPipelineEmpty';
import AssetPipelineItemComponent from './AssetPipeline/AssetPipelineItemComponent';
import { usePipelineData } from './AssetPipeline/usePipelineData';
import { AssetPipelineMonitorProps } from './AssetPipeline/types';

const AssetPipelineMonitor = ({ 
  candidates, 
  availableSignals, 
  currentSignal,
  portfolioValue,
  isSimulationActive 
}: AssetPipelineMonitorProps) => {
  const pipelineItems = usePipelineData({ candidates, availableSignals, isSimulationActive });

  if (pipelineItems.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-400" />
            <span>Asset Analyse & Handels-Pipeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetPipelineEmpty />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>
            <AssetPipelineHeader 
              itemCount={pipelineItems.length}
              isSimulationActive={isSimulationActive}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pipelineItems.map((item, index) => (
              <AssetPipelineItemComponent
                key={`${item.symbol}-${index}`}
                item={item}
                portfolioValue={portfolioValue}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default AssetPipelineMonitor;
