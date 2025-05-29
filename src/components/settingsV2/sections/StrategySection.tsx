
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        return 'Niedrigeres Risiko, kleinere Positionen, weniger offene Trades';
      case 'balanced':
        return 'Ausgewogenes Verhältnis zwischen Risiko und Ertrag';
      case 'aggressive':
        return 'Höheres Risiko, größere Positionen, mehr offene Trades';
      default:
        return '';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Handelsstrategie</CardTitle>
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
                Konservativ
              </SelectItem>
              <SelectItem value="balanced" className="text-white hover:bg-slate-600">
                Ausgewogen
              </SelectItem>
              <SelectItem value="aggressive" className="text-white hover:bg-slate-600">
                Aggressiv
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Strategy Parameters Display */}
        <div className="mt-4 p-4 bg-slate-700 rounded-lg">
          <h4 className="text-white font-medium mb-3">
            {getStrategyDisplayName(formData.tradingStrategy)} - Parameter
          </h4>
          <p className="text-slate-300 text-sm mb-3">
            {getStrategyDescription(formData.tradingStrategy)}
          </p>
          
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Handelsgröße:</span>
              <span className="text-white font-medium">
                {(strategyConfig.tradeFraction * 100).toFixed(1)}% des Portfoliowerts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max. offene Trades:</span>
              <span className="text-white font-medium">
                {strategyConfig.maxOpenPositions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Portfolio Drawdown-Limit:</span>
              <span className="text-white font-medium">
                {(strategyConfig.defaultStopLossPercent * 2).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Standard Stop-Loss:</span>
              <span className="text-white font-medium">
                {strategyConfig.defaultStopLossPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Standard Take-Profit:</span>
              <span className="text-white font-medium">
                +{strategyConfig.defaultTakeProfitPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategySection;
