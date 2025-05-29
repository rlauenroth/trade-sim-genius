
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, TrendingUp, Shield, Zap } from 'lucide-react';

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

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return <Shield className="h-4 w-4" />;
      case 'balanced':
        return <TrendingUp className="h-4 w-4" />;
      case 'aggressive':
        return <Zap className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'balanced':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'aggressive':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return 'Kapitalerhalt, geringes Risiko, enge Stops';
      case 'balanced':
        return 'Ausgewogenes Risiko-Rendite-Verhältnis';
      case 'aggressive':
        return 'Hohe Rendite-Chancen, höhere Risiken';
      default:
        return '';
    }
  };

  const getModelDisplayName = (modelId: string) => {
    return modelId.split('/')[1] || modelId;
  };

  return (
    <TooltipProvider>
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm">Strategie:</span>
                <Badge 
                  variant="outline" 
                  className={`${getStrategyColor(strategy)} flex items-center gap-1`}
                >
                  {getStrategyIcon(strategy)}
                  {getStrategyDisplayName(strategy)}
                </Badge>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-700 border-slate-600 text-white">
                    <p>{getStrategyDescription(strategy)}</p>
                  </TooltipContent>
                </Tooltip>
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
    </TooltipProvider>
  );
};

export default StrategyInfo;
