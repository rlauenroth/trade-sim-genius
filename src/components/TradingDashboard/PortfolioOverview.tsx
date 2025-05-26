
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

interface PortfolioOverviewProps {
  currentValue: number;
  startValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
}

const PortfolioOverview = ({ currentValue, startValue, totalPnL, totalPnLPercentage }: PortfolioOverviewProps) => {
  const isSimulated = totalPnL !== 0; // If there's PnL, we're in simulation mode

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Wallet className="h-5 w-5" />
          <span>{isSimulated ? 'Simuliertes Portfolio' : 'Portfolio-Basis'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(currentValue)}
          </div>
          <div className="text-sm text-slate-400">
            {isSimulated ? 'Startwert' : 'Aktueller Wert'}: {formatCurrency(startValue)}
          </div>
        </div>
        
        {isSimulated && (
          <div className="flex items-center space-x-2">
            {totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className={`font-medium ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalPnL)} ({formatPercentage(totalPnLPercentage)})
            </span>
          </div>
        )}

        {!isSimulated && (
          <div className="text-sm text-slate-400">
            Keine aktive Simulation
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioOverview;
