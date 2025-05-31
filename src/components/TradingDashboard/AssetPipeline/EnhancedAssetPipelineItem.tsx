
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface EnhancedAssetPipelineItemProps {
  item: {
    symbol: string;
    status: string;
    signalType?: string;
    confidenceScore?: number;
    entryPriceSuggestion?: number;
    pipelineStep: number;
    statusDescription: string;
    category: string;
    isHealthy: boolean;
    lastUpdated: number;
  };
  portfolioValue: number;
}

const EnhancedAssetPipelineItem = ({ item, portfolioValue }: EnhancedAssetPipelineItemProps) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'signal_ready':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'analyzing':
        return <Clock className="h-4 w-4 text-yellow-400 animate-spin" />;
      case 'screening':
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSignalTypeIcon = () => {
    if (!item.signalType) return null;
    return item.signalType === 'BUY' ? 
      <TrendingUp className="h-3 w-3 text-green-400" /> : 
      <TrendingDown className="h-3 w-3 text-red-400" />;
  };

  const getProgressValue = () => {
    return Math.min((item.pipelineStep / 5) * 100, 100);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return `vor ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `vor ${hours}h`;
  };

  return (
    <Card className="bg-slate-700/50 border-slate-600 p-3 hover:bg-slate-700/70 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Tooltip>
            <TooltipTrigger>
              {getStatusIcon()}
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.statusDescription}</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white">{item.symbol}</span>
              {getSignalTypeIcon()}
              {item.signalType && (
                <Badge variant="outline" className="text-xs">
                  {item.signalType}
                </Badge>
              )}
              <Badge 
                variant={item.category === 'major' ? 'default' : 'secondary'} 
                className="text-xs"
              >
                {item.category}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Progress 
                value={getProgressValue()} 
                className="h-2 flex-1 bg-slate-600"
              />
              <span className="text-xs text-slate-400">
                {item.pipelineStep}/5
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          {item.confidenceScore && (
            <div className="text-sm font-medium text-green-400">
              {(item.confidenceScore * 100).toFixed(0)}%
            </div>
          )}
          {item.entryPriceSuggestion && (
            <div className="text-xs text-slate-400">
              {formatCurrency(item.entryPriceSuggestion)}
            </div>
          )}
          <div className="text-xs text-slate-500">
            {formatTimestamp(item.lastUpdated)}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedAssetPipelineItem;
