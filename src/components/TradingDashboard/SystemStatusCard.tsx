
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, TrendingDown } from 'lucide-react';
import { ApiHealthBadge } from './StatusBadges/ApiHealthBadge';

interface SystemStatusCardProps {
  portfolioHealthStatus: string;
  apiCallsPerMinute?: number;
  apiCallLimit?: number;
  drawdownPercent?: number;
  drawdownLimit?: number;
}

export const SystemStatusCard = ({ 
  portfolioHealthStatus, 
  apiCallsPerMinute = 0, 
  apiCallLimit = 100,
  drawdownPercent = 0,
  drawdownLimit = 5
}: SystemStatusCardProps) => {
  const getDrawdownStatus = () => {
    const ratio = Math.abs(drawdownPercent) / drawdownLimit;
    if (ratio < 0.5) return { variant: 'default' as const, text: 'OK' };
    if (ratio < 0.8) return { variant: 'secondary' as const, text: 'WARN' };
    return { variant: 'destructive' as const, text: 'CRITICAL' };
  };

  const drawdownStatus = getDrawdownStatus();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          System-Gesundheit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-xs">KuCoin API:</span>
          <ApiHealthBadge />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-xs">OpenRouter API:</span>
          <Badge variant="default" className="text-xs">
            ✅ OK
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-xs flex items-center gap-1">
            <Zap className="h-3 w-3" />
            API Calls:
          </span>
          <span className="text-white text-xs">
            {apiCallsPerMinute}/{apiCallLimit}/min
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-xs flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Drawdown:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-white text-xs">
              {drawdownPercent.toFixed(2)}%
            </span>
            <Badge variant={drawdownStatus.variant} className="text-xs">
              {drawdownStatus.text}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
