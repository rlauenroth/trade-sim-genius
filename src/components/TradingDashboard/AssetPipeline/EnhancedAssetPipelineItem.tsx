
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Clock,
  Play,
  Ban
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { AssetPipelineItem } from './types';
import PipelineProgressIndicator from './PipelineProgressIndicator';

interface EnhancedAssetPipelineItemProps {
  item: AssetPipelineItem;
  portfolioValue?: number;
}

const EnhancedAssetPipelineItem = ({ item, portfolioValue }: EnhancedAssetPipelineItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSignalIcon = () => {
    switch (item.signalType) {
      case 'BUY':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'SELL':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'HOLD':
        return <Minus className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getSignalBadgeColor = () => {
    switch (item.signalType) {
      case 'BUY':
        return 'bg-green-600 text-white';
      case 'SELL':
        return 'bg-red-600 text-white';
      case 'HOLD':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-slate-600 text-slate-300';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  const getPositionSizeUSDT = () => {
    if (!item.suggestedPositionSizePercent || !portfolioValue) return null;
    return (portfolioValue * item.suggestedPositionSizePercent) / 100;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-white">{item.symbol}</span>
            {item.category && (
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {item.category}
              </Badge>
            )}
          </div>
          
          {/* Signal Badge */}
          {item.signalType && item.signalType !== 'NO_TRADE' && (
            <div className="flex items-center space-x-1">
              {getSignalIcon()}
              <Badge className={getSignalBadgeColor()}>
                {item.signalType}
              </Badge>
              {item.confidenceScore && (
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  {Math.round((item.confidenceScore || 0) * 100)}%
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Auto-Execution Indicator */}
          {item.isAutoExecuting && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center space-x-1 text-green-400">
                  <Play className="h-3 w-3" />
                  <span className="text-xs">Auto</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Wird automatisch ausgeführt</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Error/Blacklist Indicator */}
          {item.errorDetails && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center space-x-1 text-red-400">
                  {item.status === 'blacklisted' ? (
                    <Ban className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span className="text-xs">{item.errorDetails.retryCount}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div>Fehlertyp: {item.errorDetails.type}</div>
                  <div>{item.errorDetails.message}</div>
                  {item.errorDetails.blacklistedUntil && (
                    <div>Gesperrt bis: {new Date(item.errorDetails.blacklistedUntil).toLocaleTimeString()}</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Timestamp */}
          <span className="text-xs text-slate-500">
            {formatTimeAgo(item.lastUpdated)}
          </span>

          {/* Expand Button */}
          {(item.reasoning || item.positionInfo || item.entryPriceSuggestion) && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Pipeline Progress */}
      <PipelineProgressIndicator
        currentStep={item.pipelineStep}
        totalSteps={7}
        isError={item.pipelineStep === -1}
        isHealthy={item.isHealthy}
        statusDescription={item.statusDescription}
      />

      {/* Expanded Details */}
      {(item.reasoning || item.positionInfo || item.entryPriceSuggestion) && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-3 pt-2 border-t border-slate-700">
            
            {/* Signal Details */}
            {item.entryPriceSuggestion && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Einstieg:</span>
                  <div className="text-white font-medium">
                    {typeof item.entryPriceSuggestion === 'string' 
                      ? item.entryPriceSuggestion 
                      : formatCurrency(item.entryPriceSuggestion)
                    }
                  </div>
                </div>
                
                {item.takeProfitPrice && (
                  <div>
                    <span className="text-slate-400">Take Profit:</span>
                    <div className="text-green-400 font-medium">
                      {formatCurrency(item.takeProfitPrice)}
                    </div>
                  </div>
                )}
                
                {item.stopLossPrice && (
                  <div>
                    <span className="text-slate-400">Stop Loss:</span>
                    <div className="text-red-400 font-medium">
                      {formatCurrency(item.stopLossPrice)}
                    </div>
                  </div>
                )}
                
                {item.suggestedPositionSizePercent && (
                  <div>
                    <span className="text-slate-400">Position:</span>
                    <div className="text-white font-medium">
                      {item.suggestedPositionSizePercent.toFixed(1)}%
                      {getPositionSizeUSDT() && (
                        <div className="text-xs text-slate-500">
                          ~{formatCurrency(getPositionSizeUSDT()!)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Position Info */}
            {item.positionInfo && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Typ:</span>
                  <div className={`font-medium ${item.positionInfo.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {item.positionInfo.type}
                  </div>
                </div>
                
                <div>
                  <span className="text-slate-400">Einstieg:</span>
                  <div className="text-white font-medium">
                    {formatCurrency(item.positionInfo.entryPrice)}
                  </div>
                </div>
                
                {item.positionInfo.currentPrice && (
                  <div>
                    <span className="text-slate-400">Aktuell:</span>
                    <div className="text-white font-medium">
                      {formatCurrency(item.positionInfo.currentPrice)}
                    </div>
                  </div>
                )}
                
                {item.positionInfo.pnl !== undefined && (
                  <div>
                    <span className="text-slate-400">P&L:</span>
                    <div className={`font-medium ${item.positionInfo.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(item.positionInfo.pnl)}
                      {item.positionInfo.pnlPercentage && (
                        <span className="text-xs ml-1">
                          ({item.positionInfo.pnlPercentage.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reasoning */}
            {item.reasoning && (
              <div>
                <span className="text-slate-400 text-sm">KI-Begründung:</span>
                <div className="text-slate-300 text-sm mt-1 p-2 bg-slate-900 rounded border border-slate-700">
                  {item.reasoning}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default EnhancedAssetPipelineItem;
