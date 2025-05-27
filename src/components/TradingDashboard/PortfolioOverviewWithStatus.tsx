
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortfolioLive } from '@/hooks/usePortfolioLive';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { snapshot, isLoading, error, refresh } = usePortfolioLive();
  const isPositive = totalPnL >= 0;

  // Use live portfolio value if available, otherwise fallback to passed props
  const displayValue = snapshot?.totalUSDValue || currentValue;

  if (isLoading && !snapshot) {
    return (
      <Card className="bg-slate-800 border-slate-700 relative">
        <CardHeader>
          <CardTitle className="text-white">Portfolio-Übersicht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-32 bg-slate-600" />
          <Skeleton className="h-6 w-24 bg-slate-600" />
          <Skeleton className="h-6 w-40 bg-slate-600" />
        </CardContent>
        <PortfolioStatusOverlay />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-600/50 relative">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span>Portfolio-Übersicht</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-red-300 text-sm">
            {error}
          </div>
          <Button 
            onClick={refresh}
            variant="outline"
            size="sm"
            className="border-red-600/50 text-red-300 hover:bg-red-900/30"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        </CardContent>
        <PortfolioStatusOverlay />
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700 relative">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Portfolio-Übersicht</span>
          {snapshot && (
            <Button
              onClick={refresh}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-slate-400">Aktueller Wert</div>
          <div className="text-2xl font-bold text-white">
            ${displayValue.toLocaleString()}
          </div>
          {snapshot && (
            <div className="text-xs text-slate-500">
              Live-Daten • {new Date(snapshot.fetchedAt).toLocaleTimeString()}
            </div>
          )}
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
