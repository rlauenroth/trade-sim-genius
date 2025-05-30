
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioValueDisplayProps {
  currentValue: number;
  startValue?: number | null;
  className?: string;
}

export const PortfolioValueDisplay = ({ currentValue, startValue, className }: PortfolioValueDisplayProps) => {
  const [currency, setCurrency] = useState<'USDT' | 'BTC'>('USDT');

  const formatValue = (value: number) => {
    if (currency === 'USDT') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      // Mock BTC conversion for now
      const btcValue = value / 60000; // Assuming ~60k USD/BTC
      return `₿${btcValue.toFixed(6)}`;
    }
  };

  const getPnL = () => {
    if (!startValue) return null;
    const pnl = currentValue - startValue;
    const pnlPercent = (pnl / startValue) * 100;
    return { pnl, pnlPercent };
  };

  const pnlData = getPnL();

  return (
    <div className={`${className} flex items-center gap-2`}>
      <div className="text-right">
        <div className="text-lg font-bold text-white">
          Portfolio: {formatValue(currentValue)}
        </div>
        {pnlData && (
          <div className={`text-sm flex items-center gap-1 ${pnlData.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnlData.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatValue(Math.abs(pnlData.pnl))} ({pnlData.pnlPercent >= 0 ? '+' : ''}{pnlData.pnlPercent.toFixed(2)}%)
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrency(currency === 'USDT' ? 'BTC' : 'USDT')}
        className="text-xs"
      >
        {currency}
      </Button>
    </div>
  );
};
