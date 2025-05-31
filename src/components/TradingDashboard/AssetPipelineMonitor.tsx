
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import AssetPipelineHeader from './AssetPipeline/AssetPipelineHeader';
import AssetPipelineEmpty from './AssetPipeline/AssetPipelineEmpty';
import EnhancedAssetPipelineItem from './AssetPipeline/EnhancedAssetPipelineItem';
import { useEnhancedPipelineData } from './AssetPipeline/useEnhancedPipelineData';
import { AssetPipelineMonitorProps } from './AssetPipeline/types';

const AssetPipelineMonitor = ({ 
  candidates, 
  availableSignals, 
  currentSignal,
  portfolioValue,
  isSimulationActive,
  openPositions = []
}: AssetPipelineMonitorProps) => {
  const pipelineItems = useEnhancedPipelineData({ 
    candidates, 
    availableSignals, 
    isSimulationActive,
    openPositions 
  });

  if (pipelineItems.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>
            <AssetPipelineHeader 
              itemCount={0}
              isSimulationActive={isSimulationActive}
            />
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
              <EnhancedAssetPipelineItem
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
