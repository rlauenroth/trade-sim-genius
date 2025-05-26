
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import PortfolioStatusOverlay from './PortfolioStatusOverlay';

interface PortfolioOverviewWithStatusProps {
  currentValue: number;
  startValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
}

const PortfolioOverviewWithStatus = ({
  currentValue,
  startValue,
  totalPnL,
  totalPnLPercentage
}: PortfolioOverviewWithStatusProps) => {
  const isPositive = totalPnL >= 0;

  return (
    <Card className="bg-slate-800 border-slate-700 relative">
      <CardHeader>
        <CardTitle className="text-white">Portfolio-Übersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-slate-400">Aktueller Wert</div>
          <div className="text-2xl font-bold text-white">
            ${currentValue.toLocaleString()}
          </div>
        </div>
        
        <div>
          <div className="text-sm text-slate-400">Startwert</div>
          <div className="text-lg text-slate-300">
            ${startValue.toLocaleString()}
          </div>
        </div>
        
        <div className="border-t border-slate-600 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Gesamt P&L</div>
            <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium">
                {isPositive ? '+' : ''}${totalPnL.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right mt-1">
            <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              ({isPositive ? '+' : ''}{totalPnLPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </CardContent>
      
      {/* Status overlay */}
      <PortfolioStatusOverlay />
    </Card>
  );
};

export default PortfolioOverviewWithStatus;
