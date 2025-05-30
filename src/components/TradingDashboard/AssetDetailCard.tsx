
import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createChart, IChartApi } from 'lightweight-charts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AssetDetailCardProps {
  selectedAsset?: {
    symbol: string;
    currentPrice?: number;
    priceData?: Array<{ time: string; open: number; high: number; low: number; close: number; }>;
    indicators?: {
      rsi?: number;
      macd?: number;
    };
    aiDecisions?: Array<{ timestamp: number; decision: string; reason: string; }>;
  };
  className?: string;
}

export const AssetDetailCard = ({ selectedAsset, className }: AssetDetailCardProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !selectedAsset?.priceData) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { color: '#1e293b' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      timeScale: {
        borderColor: '#4b5563',
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    // Convert and set data
    const chartData = selectedAsset.priceData.map(item => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candlestickSeries.setData(chartData);
    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [selectedAsset]);

  if (!selectedAsset) {
    return (
      <Card className={`${className} bg-slate-800 border-slate-700`}>
        <CardContent className="flex items-center justify-center h-48 text-slate-400">
          Wählen Sie einen Kandidaten oder eine Position aus, um Details anzuzeigen
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} bg-slate-800 border-slate-700`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center justify-between">
          <span>Detailansicht: {selectedAsset.symbol}</span>
          {selectedAsset.currentPrice && (
            <span className="text-lg font-bold">
              ${selectedAsset.currentPrice.toLocaleString()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div ref={chartContainerRef} className="w-full" />
        
        {/* Technical Indicators */}
        {selectedAsset.indicators && (
          <div className="grid grid-cols-2 gap-4">
            {selectedAsset.indicators.rsi && (
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">RSI:</span>
                <span className={`text-xs ${selectedAsset.indicators.rsi > 70 ? 'text-red-400' : selectedAsset.indicators.rsi < 30 ? 'text-green-400' : 'text-white'}`}>
                  {selectedAsset.indicators.rsi.toFixed(1)}
                </span>
              </div>
            )}
            {selectedAsset.indicators.macd && (
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">MACD:</span>
                <span className={`text-xs flex items-center gap-1 ${selectedAsset.indicators.macd > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedAsset.indicators.macd > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {selectedAsset.indicators.macd.toFixed(3)}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* AI Decision History */}
        {selectedAsset.aiDecisions && selectedAsset.aiDecisions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-slate-300 text-xs font-semibold">KI-Entscheidungshistorie:</h4>
            <div className="max-h-20 overflow-y-auto space-y-1">
              {selectedAsset.aiDecisions.slice(-3).map((decision, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {new Date(decision.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-white font-medium">
                      {decision.decision}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs truncate">
                    {decision.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
