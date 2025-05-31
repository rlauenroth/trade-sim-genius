
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
  console.log('🔄 AssetPipelineMonitor: MAIN COMPONENT props received:', {
    candidatesCount: candidates?.length || 0,
    availableSignalsCount: availableSignals?.length || 0,
    currentSignal: !!currentSignal,
    portfolioValue,
    isSimulationActive,
    openPositionsCount: openPositions?.length || 0,
    candidates: candidates?.map(c => ({ symbol: c.symbol, status: c.status, lastUpdate: c.lastStatusUpdate })) || [],
    availableSignals: availableSignals?.map(s => ({ assetPair: s.assetPair, signalType: s.signalType })) || [],
    renderTimestamp: Date.now()
  });

  const pipelineItems = useEnhancedPipelineData({ 
    candidates, 
    availableSignals, 
    isSimulationActive,
    openPositions 
  });

  console.log('🔄 AssetPipelineMonitor: Pipeline items processed for UI:', {
    itemCount: pipelineItems.length,
    items: pipelineItems.map(item => ({ 
      symbol: item.symbol, 
      status: item.status,
      pipelineStep: item.pipelineStep,
      signalType: item.signalType,
      lastUpdated: item.lastUpdated
    })),
    isEmpty: pipelineItems.length === 0,
    renderTimestamp: Date.now()
  });

  // Fallback mechanism: If we have no pipeline items but have a current signal, create a fallback item
  const fallbackItems = [];
  if (pipelineItems.length === 0 && currentSignal) {
    console.log('🔄 AssetPipelineMonitor: FALLBACK - Creating item from current signal:', currentSignal);
    fallbackItems.push({
      symbol: currentSignal.assetPair,
      status: 'signal_ready' as const,
      signalType: currentSignal.signalType,
      confidenceScore: currentSignal.confidenceScore,
      entryPriceSuggestion: currentSignal.entryPriceSuggestion,
      takeProfitPrice: currentSignal.takeProfitPrice,
      stopLossPrice: currentSignal.stopLossPrice,
      reasoning: currentSignal.reasoning,
      suggestedPositionSizePercent: currentSignal.suggestedPositionSizePercent,
      lastUpdated: Date.now(),
      pipelineStep: 4,
      statusDescription: `${currentSignal.signalType} Signal verfügbar`,
      category: 'major',
      isHealthy: true
    });
  }

  const finalItems = pipelineItems.length > 0 ? pipelineItems : fallbackItems;

  if (finalItems.length === 0) {
    console.log('🔄 AssetPipelineMonitor: Showing empty state - no items available');
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

  console.log('🔄 AssetPipelineMonitor: Rendering pipeline with items:', {
    finalItemCount: finalItems.length,
    usedFallback: fallbackItems.length > 0,
    renderTimestamp: Date.now()
  });

  return (
    <TooltipProvider>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>
            <AssetPipelineHeader 
              itemCount={finalItems.length}
              isSimulationActive={isSimulationActive}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {finalItems.map((item, index) => (
              <EnhancedAssetPipelineItem
                key={`${item.symbol}-${index}-${item.lastUpdated}`}
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
