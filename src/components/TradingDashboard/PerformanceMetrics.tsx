
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface PerformanceMetricsProps {
  portfolioHealthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

const PerformanceMetrics = ({ portfolioHealthStatus }: PerformanceMetricsProps) => {
  const { getPerformanceMetrics } = usePerformanceMonitoring();
  const metrics = getPerformanceMetrics();

  const getHealthIcon = () => {
    switch (portfolioHealthStatus) {
      case 'HEALTHY':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
  };

  const getHealthColor = () => {
    switch (portfolioHealthStatus) {
      case 'HEALTHY':
        return 'text-green-400';
      case 'WARNING':
        return 'text-yellow-400';
      case 'CRITICAL':
        return 'text-red-400';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <span>Performance & Risiko</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-slate-400">Portfolio-Status</div>
            <div className={`flex items-center space-x-2 ${getHealthColor()}`}>
              {getHealthIcon()}
              <span className="font-medium">{portfolioHealthStatus}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-slate-400">Ø API Antwortzeit</div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className={`font-medium ${metrics.averageResponseTime > 200 ? 'text-red-400' : 'text-green-400'}`}>
                {metrics.averageResponseTime.toFixed(0)}ms
              </span>
              <Badge variant={metrics.averageResponseTime > 200 ? 'destructive' : 'secondary'} className="text-xs">
                {metrics.averageResponseTime > 200 ? 'LANGSAM' : 'OPTIMAL'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-slate-400">Ø Zyklus-Performance</div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <span className={`font-medium ${metrics.portfolioGrowthPercent >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.portfolioGrowthPercent >= 0 ? '+' : ''}{metrics.portfolioGrowthPercent.toFixed(2)}%
              </span>
              <Badge variant={metrics.portfolioGrowthPercent >= 1 ? 'secondary' : 'destructive'} className="text-xs">
                {metrics.portfolioGrowthPercent >= 1 ? 'ZIEL ERREICHT' : 'UNTER ZIEL'}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-slate-400">Erfolgsquote</div>
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${metrics.successRate >= 95 ? 'text-green-400' : 'text-yellow-400'}`}>
                {metrics.successRate.toFixed(1)}%
              </span>
              <Badge variant={metrics.successRate >= 95 ? 'secondary' : 'outline'} className="text-xs">
                {metrics.totalRequests} Anfragen
              </Badge>
            </div>
          </div>
        </div>

        {metrics.slowRequests > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{metrics.slowRequests} langsame API-Anfragen (&gt;200ms) in den letzten 10 Minuten</span>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 mt-2">
          Ziel: 1% Wachstum pro Zyklus, &lt;200ms API-Antwortzeit, &gt;95% Erfolgsquote
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMetrics;
