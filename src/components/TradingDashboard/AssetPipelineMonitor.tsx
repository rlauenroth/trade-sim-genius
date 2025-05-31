
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
  console.log('🔄 AssetPipelineMonitor props received:', {
    candidatesCount: candidates?.length || 0,
    availableSignalsCount: availableSignals?.length || 0,
    currentSignal: !!currentSignal,
    portfolioValue,
    isSimulationActive,
    openPositionsCount: openPositions?.length || 0,
    candidates: candidates?.map(c => ({ symbol: c.symbol, status: c.status })) || [],
    availableSignals: availableSignals?.map(s => ({ assetPair: s.assetPair, signalType: s.signalType })) || []
  });

  const pipelineItems = useEnhancedPipelineData({ 
    candidates, 
    availableSignals, 
    isSimulationActive,
    openPositions 
  });

  console.log('🔄 AssetPipelineMonitor pipeline items processed:', {
    itemCount: pipelineItems.length,
    items: pipelineItems.map(item => ({ 
      symbol: item.symbol, 
      status: item.status,
      pipelineStep: item.pipelineStep,
      signalType: item.signalType
    }))
  });

  if (pipelineItems.length === 0) {
    console.log('🔄 AssetPipelineMonitor: Showing empty state');
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

  console.log('🔄 AssetPipelineMonitor: Rendering pipeline with items');
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
