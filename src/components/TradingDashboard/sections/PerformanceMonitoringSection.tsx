
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, Clock, Target } from 'lucide-react';

interface PerformanceMetrics {
  cycleCount: number;
  averageCycleTime: number;
  successfulTrades: number;
  failedTrades: number;
  portfolioGrowth: number;
  healthScore: number;
}

interface PerformanceMonitoringSectionProps {
  metrics: PerformanceMetrics;
  isSimulationActive: boolean;
}

const PerformanceMonitoringSection = ({ 
  metrics, 
  isSimulationActive 
}: PerformanceMonitoringSectionProps) => {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const successRate = metrics.cycleCount > 0 
    ? ((metrics.successfulTrades / metrics.cycleCount) * 100).toFixed(1)
    : '0';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="h-5 w-5" />
          Performance Monitoring
          <Badge 
            variant={isSimulationActive ? 'default' : 'secondary'}
            className="ml-auto"
          >
            {isSimulationActive ? 'Aktiv' : 'Inaktiv'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-300">Gesundheitsscore</span>
            </div>
            <div className="flex items-center gap-3">
              <Progress 
                value={metrics.healthScore} 
                className="flex-1 bg-slate-700"
              />
              <Badge variant={getHealthBadgeVariant(metrics.healthScore)}>
                {metrics.healthScore.toFixed(0)}%
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Portfolio Wachstum</span>
            </div>
            <div className={`text-lg font-medium ${
              metrics.portfolioGrowth >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {metrics.portfolioGrowth >= 0 ? '+' : ''}{metrics.portfolioGrowth.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-700">
          <div className="text-center">
            <div className="text-sm text-slate-400">Zyklen</div>
            <div className="text-lg font-medium text-white">{metrics.cycleCount}</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-slate-400">Erfolgsrate</div>
            <div className="text-lg font-medium text-green-400">{successRate}%</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-slate-400">Ø Zeit/Zyklus</div>
            <div className="text-lg font-medium text-blue-400">
              {formatTime(metrics.averageCycleTime)}
            </div>
          </div>
        </div>

        {metrics.cycleCount > 0 && (
          <div className="pt-2 border-t border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Erfolgreiche Trades:</span>
              <span className="text-green-400">{metrics.successfulTrades}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-400">Fehlgeschlagene Trades:</span>
              <span className="text-red-400">{metrics.failedTrades}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitoringSection;
