
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';

interface Position {
  id: string;
  assetPair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  takeProfit: number;
  stopLoss: number;
  unrealizedPnL: number;
  openTimestamp: number;
}

interface OpenPositionsProps {
  positions: Position[];
}

const OpenPositions = ({ positions }: OpenPositionsProps) => {
  if (!positions || positions.length === 0) return null;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Offene simulierte Positionen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {positions.map((position) => (
            <div key={position.id} className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-medium text-white">{position.assetPair}</div>
                    <div className="text-sm text-slate-400">
                      {position.quantity} @ {formatCurrency(position.entryPrice)}
                    </div>
                  </div>
                  <Badge className={position.type === 'BUY' ? 'bg-green-600' : 'bg-red-600'}>
                    {position.type}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(position.unrealizedPnL)}
                  </div>
                  <div className="text-sm text-slate-400">
                    TP: {formatCurrency(position.takeProfit)} | SL: {formatCurrency(position.stopLoss)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OpenPositions;
