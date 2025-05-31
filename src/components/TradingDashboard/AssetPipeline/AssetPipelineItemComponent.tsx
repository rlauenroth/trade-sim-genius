
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, TrendingUp, CheckCircle, XCircle, Activity, Zap } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { AssetPipelineItem } from './types';

interface AssetPipelineItemProps {
  item: AssetPipelineItem;
  portfolioValue?: number;
}

const AssetPipelineItemComponent = ({ item, portfolioValue }: AssetPipelineItemProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'screening': return <Activity className="h-4 w-4 text-blue-400" />;
      case 'analyzed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'signal': return <Zap className="h-4 w-4 text-yellow-400" />;
      case 'exit-screening': return <TrendingUp className="h-4 w-4 text-purple-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'screening': return 'Screening';
      case 'analyzed': return 'Analysiert';
      case 'signal': return 'Signal';
      case 'exit-screening': return 'Exit Screening';
      case 'error': return 'Fehler';
      default: return 'Unbekannt';
    }
  };

  const getSignalBadge = (signalType?: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE') => {
    if (!signalType) return null;
    
    const colors = {
      BUY: 'bg-green-600 text-white',
      SELL: 'bg-red-600 text-white', 
      HOLD: 'bg-gray-600 text-white',
      NO_TRADE: 'bg-slate-600 text-white'
    };
    
    return (
      <Badge className={colors[signalType]}>
        {signalType}
      </Badge>
    );
  };

  const calculatePositionSize = () => {
    if (!portfolioValue || !item.suggestedPositionSizePercent) return null;
    
    const usdAmount = portfolioValue * (item.suggestedPositionSizePercent / 100);
    return {
      percentage: item.suggestedPositionSizePercent,
      usdAmount
    };
  };

  const positionSize = calculatePositionSize();

  return (
    <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon(item.status)}
            <span className="font-medium text-white">{item.symbol}</span>
          </div>
          
          <Badge variant="outline" className="text-slate-300 border-slate-600">
            {getStatusText(item.status)}
          </Badge>
          
          {item.signalType && getSignalBadge(item.signalType)}
          
          {item.confidenceScore && (
            <div className="flex items-center space-x-1">
              <div className="text-sm text-slate-400">Konfidenz:</div>
              <div className="text-sm font-medium text-blue-400">
                {Math.round(item.confidenceScore * 100)}%
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-slate-500">
          {new Date(item.lastUpdated).toLocaleTimeString('de-DE')}
        </div>
      </div>

      {/* Signal Details Row */}
      {item.status === 'signal' && item.signalType && item.signalType !== 'NO_TRADE' && item.signalType !== 'HOLD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-600">
          {item.entryPriceSuggestion && (
            <div>
              <div className="text-xs text-slate-400">Einstiegspreis</div>
              <div className="text-sm font-medium text-white">
                {typeof item.entryPriceSuggestion === 'number' 
                  ? formatCurrency(item.entryPriceSuggestion)
                  : item.entryPriceSuggestion
                }
              </div>
            </div>
          )}
          
          {item.takeProfitPrice && (
            <div>
              <div className="text-xs text-slate-400">Take Profit</div>
              <div className="text-sm font-medium text-green-400">
                {formatCurrency(item.takeProfitPrice)}
              </div>
            </div>
          )}
          
          {item.stopLossPrice && (
            <div>
              <div className="text-xs text-slate-400">Stop Loss</div>
              <div className="text-sm font-medium text-red-400">
                {formatCurrency(item.stopLossPrice)}
              </div>
            </div>
          )}
          
          {positionSize && (
            <div>
              <div className="text-xs text-slate-400">Positionsgröße</div>
              <div className="text-sm font-medium text-white">
                {positionSize.percentage}% ({formatCurrency(positionSize.usdAmount)})
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reasoning Row */}
      {item.reasoning && (
        <div className="pt-2 border-t border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-slate-400 cursor-help">
                <span className="font-medium">KI-Begründung:</span>{' '}
                <span className="line-clamp-2">
                  {item.reasoning.length > 100 
                    ? `${item.reasoning.substring(0, 100)}...` 
                    : item.reasoning
                  }
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md">
              <div className="text-sm">{item.reasoning}</div>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Auto-execution indicator */}
      {item.isAutoExecuting && (
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-600">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400 font-medium">
            Wird automatisch ausgeführt
          </span>
        </div>
      )}
    </div>
  );
};

export default AssetPipelineItemComponent;
