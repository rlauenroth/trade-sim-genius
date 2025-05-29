
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { getStrategyConfig } from '@/config/strategy';

interface StrategySectionProps {
  formData: {
    tradingStrategy: 'conservative' | 'balanced' | 'aggressive';
  };
  onFieldChange: (field: string, value: any) => void;
}

const StrategySection = ({ formData, onFieldChange }: StrategySectionProps) => {
  const strategyConfig = getStrategyConfig(formData.tradingStrategy);

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

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return 'Niedrigeres Risiko, kleinere Positionen, weniger offene Trades - ideal für kapitalerhaltende Strategien';
      case 'balanced':
        return 'Ausgewogenes Verhältnis zwischen Risiko und Ertrag - moderate Positionsgrößen und Risikotoleranz';
      case 'aggressive':
        return 'Höheres Risiko, größere Positionen, mehr offene Trades - fokussiert auf maximale Rendite-Chancen';
      default:
        return '';
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return 'text-green-400';
      case 'balanced':
        return 'text-blue-400';
      case 'aggressive':
        return 'text-orange-400';
      default:
        return 'text-white';
    }
  };

  return (
    <TooltipProvider>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            Handelsstrategie
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-700 border-slate-600 text-white max-w-xs">
                <p>Die Handelsstrategie bestimmt Ihre Risikotoleranz und beeinflusst Positionsgrößen, Stop-Loss/Take-Profit Levels und die maximale Anzahl gleichzeitiger Trades.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Wählen Sie das Risikoprofil und die damit verbundenen Handelsparameter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trading-strategy" className="text-white">
              Strategie
            </Label>
            <Select
              value={formData.tradingStrategy}
              onValueChange={(value) => onFieldChange('tradingStrategy', value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Wählen Sie eine Strategie" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="conservative" className="text-white hover:bg-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Konservativ
                  </div>
                </SelectItem>
                <SelectItem value="balanced" className="text-white hover:bg-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    Ausgewogen
                  </div>
                </SelectItem>
                <SelectItem value="aggressive" className="text-white hover:bg-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    Aggressiv
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Strategy Parameters Display */}
          <div className="mt-4 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <h4 className={`font-medium mb-3 flex items-center gap-2 ${getStrategyColor(formData.tradingStrategy)}`}>
              <div className={`w-3 h-3 rounded-full ${
                formData.tradingStrategy === 'conservative' ? 'bg-green-400' :
                formData.tradingStrategy === 'balanced' ? 'bg-blue-400' : 'bg-orange-400'
              }`}></div>
              {getStrategyDisplayName(formData.tradingStrategy)} - Parameter
            </h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              {getStrategyDescription(formData.tradingStrategy)}
            </p>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  Handelsgröße:
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-700 border-slate-600 text-white max-w-xs">
                      <p>Prozentsatz des Gesamtportfoliowerts, der pro Trade verwendet wird.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-white font-medium">
                  {(strategyConfig.tradeFraction * 100).toFixed(1)}% des Portfoliowerts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  Max. offene Trades:
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-700 border-slate-600 text-white max-w-xs">
                      <p>Maximale Anzahl gleichzeitig offener Positionen zur Risikobegrenzung.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-white font-medium">
                  {strategyConfig.maxOpenPositions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  Portfolio Drawdown-Limit:
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-700 border-slate-600 text-white max-w-xs">
                      <p>Maximaler Verlust des Gesamtportfolios, bevor der Trading-Bot automatisch pausiert.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-white font-medium">
                  {(strategyConfig.defaultStopLossPercent * 2).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  Standard Stop-Loss:
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-700 border-slate-600 text-white max-w-xs">
                      <p>Automatischer Verlust-Stopp pro Trade zur Risikobegrenzung.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-white font-medium">
                  {strategyConfig.defaultStopLossPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  Standard Take-Profit:
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-700 border-slate-600 text-white max-w-xs">
                      <p>Automatisches Gewinn-Ziel pro Trade zur Gewinnmitnahme.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-white font-medium">
                  +{strategyConfig.defaultTakeProfitPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default StrategySection;
