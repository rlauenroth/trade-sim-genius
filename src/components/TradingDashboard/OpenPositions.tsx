
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Eye, X } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  timestamp: number;
}

interface OpenPositionsProps {
  positions: Position[];
  onPositionClick?: (position: Position) => void;
  onClosePosition?: (positionId: string) => void;
  isRealTrading?: boolean;
}

const OpenPositions = ({ 
  positions = [], 
  onPositionClick,
  onClosePosition,
  isRealTrading = false 
}: OpenPositionsProps) => {
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatQuantity = (quantity: number) => {
    return quantity.toFixed(6);
  };

  const getPositionAge = (timestamp: number) => {
    const age = Date.now() - timestamp;
    const hours = Math.floor(age / 3600000);
    const minutes = Math.floor((age % 3600000) / 60000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center justify-between">
          <span>Offene Positionen</span>
          <Badge variant="secondary" className="text-xs">
            {positions.length} Positionen
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="text-center text-slate-400 py-6 text-sm">
            Keine offenen Positionen
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {positions.map((position) => (
              <div
                key={position.id}
                className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
                onClick={() => onPositionClick?.(position)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">
                      {position.symbol}
                    </span>
                    <Badge 
                      variant={position.side === 'BUY' ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {position.side === 'BUY' ? 'LONG' : 'SHORT'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {onPositionClick && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    {isRealTrading && onClosePosition && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClosePosition(position.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Menge:</span>
                    <span className="text-white">{formatQuantity(position.quantity)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-300">Einstieg:</span>
                    <span className="text-white">{formatPrice(position.entryPrice)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-300">Aktuell:</span>
                    <span className="text-white">{formatPrice(position.currentPrice)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-300">P&L:</span>
                    <div className={`flex items-center gap-1 ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {position.unrealizedPnL >= 0 ? 
                        <TrendingUp className="h-3 w-3" /> : 
                        <TrendingDown className="h-3 w-3" />
                      }
                      <span>
                        {formatPrice(Math.abs(position.unrealizedPnL))} ({position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  
                  {position.stopLoss && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">SL:</span>
                      <span className="text-red-400">{formatPrice(position.stopLoss)}</span>
                    </div>
                  )}
                  
                  {position.takeProfit && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">TP:</span>
                      <span className="text-green-400">{formatPrice(position.takeProfit)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-1 border-t border-slate-600">
                    <span className="text-slate-300">Alter:</span>
                    <span className="text-slate-400">{getPositionAge(position.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpenPositions;
