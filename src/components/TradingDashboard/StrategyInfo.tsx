
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StrategyInfoProps {
  strategy: string;
  aiModel: string;
  timeElapsed?: string;
  isSimulationActive: boolean;
}

const StrategyInfo = ({ strategy, aiModel, timeElapsed, isSimulationActive }: StrategyInfoProps) => {
  const getStrategyDisplayName = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return 'Konservativ';
      case 'balanced':
        return 'Ausgewogen';
      case 'aggressive':
        return 'Aggressiv';
      default:
        return strategy;
    }
  };

  const getModelDisplayName = (modelId: string) => {
    return modelId.split('/')[1] || modelId;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-slate-400">Strategie: </span>
              <span className="text-white font-medium">
                {getStrategyDisplayName(strategy)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">KI-Modell: </span>
              <span className="text-white font-medium">
                {getModelDisplayName(aiModel)}
              </span>
            </div>
          </div>
          {isSimulationActive && timeElapsed && (
            <div className="text-sm text-slate-400">
              Laufzeit: <span className="text-white font-mono">{timeElapsed}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyInfo;
