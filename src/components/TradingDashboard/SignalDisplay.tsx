
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Clock, TrendingUp, BarChart3, CheckCircle, Play } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useRiskManagement } from '@/hooks/useRiskManagement';
import { useAppState } from '@/hooks/useAppState';
import { getAssetCategory } from '@/config/aiSignalConfig';

interface Signal {
  assetPair: string;
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  entryPriceSuggestion: string | number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidenceScore?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
}

interface SignalDisplayProps {
  currentSignal: Signal | null;
  availableSignals?: Signal[];
  onAcceptSignal: (signal: Signal) => void;
  onIgnoreSignal: (signal: Signal) => void;
  portfolioValue?: number;
}

const SignalDisplay = ({ 
  currentSignal, 
  availableSignals = [], 
  portfolioValue 
}: SignalDisplayProps) => {
  const { userSettings } = useAppState();
  const { getTradeDisplayInfo } = useRiskManagement(userSettings.tradingStrategy || 'balanced');
  const [selectedSignalIndex, setSelectedSignalIndex] = useState(0);

  // Clear priority: use availableSignals if they exist, otherwise currentSignal
  // This prevents duplicates by having a single source of truth
  const displaySignals = availableSignals.length > 0 ? availableSignals : [];
  const primarySignal = displaySignals[selectedSignalIndex] || currentSignal;

  // Only show if we have actionable signals (BUY/SELL)
  const hasActionableSignals = primarySignal && (primarySignal.signalType === 'BUY' || primarySignal.signalType === 'SELL');

  if (!hasActionableSignals) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-400 flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>KI-Signal Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-slate-400 mb-2">Warte auf handelbare Signale...</div>
            <div className="text-sm text-slate-500">
              Nur echte KI-Analysen werden angezeigt
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayInfo = portfolioValue ? getTradeDisplayInfo(portfolioValue, userSettings.tradingStrategy || 'balanced') : null;

  // Render single signal view with clear auto-execution indication
  const renderSignalCard = (signal: Signal) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-slate-400">Asset</div>
          <div className="font-bold text-white flex items-center space-x-2">
            <span>{signal.assetPair}</span>
            <Badge variant="outline" className="text-xs">
              {getAssetCategory(signal.assetPair)}
            </Badge>
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-400">Aktion</div>
          <Badge className={signal.signalType === 'BUY' ? 'bg-green-600' : 'bg-red-600'}>
            {signal.signalType === 'BUY' ? 'KAUFEN' : 'VERKAUFEN'}
          </Badge>
        </div>
        <div>
          <div className="text-sm text-slate-400">Ziel</div>
          <div className="text-white">{formatCurrency(signal.takeProfitPrice)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-400">Stop-Loss</div>
          <div className="text-white">{formatCurrency(signal.stopLossPrice)}</div>
        </div>
      </div>

      {signal.confidenceScore && (
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-slate-400">Konfidenz:</span>
          <span className="text-white font-medium">{Math.round(signal.confidenceScore * 100)}%</span>
        </div>
      )}

      {displayInfo && (
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-sm text-slate-400 mb-1">Geplante Positionsgröße:</div>
          <div className="text-lg font-bold text-white">
            ${displayInfo.idealSize} USDT ({displayInfo.percentage}% des Portfolios)
          </div>
          <div className="text-xs text-slate-500">
            Minimum für Trade: ${displayInfo.minimum} USDT
          </div>
        </div>
      )}
      
      {signal.reasoning && (
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-sm text-slate-400 mb-1">KI-Begründung:</div>
          <div className="text-sm text-slate-200">{signal.reasoning}</div>
        </div>
      )}
      
      {/* Enhanced automatic execution indicator */}
      <div className="flex items-center justify-center py-3 bg-green-600/20 rounded-lg border border-green-500/30">
        <Play className="h-5 w-5 text-green-400 mr-2 animate-pulse" />
        <span className="text-green-400 font-medium">
          Signal wird automatisch ausgeführt
        </span>
      </div>
    </div>
  );

  return (
    <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-green-500">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Bot className="h-5 w-5 text-green-400" />
          <span>Aktives KI-Signal</span>
          <Badge className="bg-green-600 text-xs animate-pulse">AUTO-MODUS</Badge>
          {displaySignals.length > 1 && (
            <Badge variant="outline" className="text-xs">
              {displaySignals.length} Signale
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displaySignals.length > 1 ? (
          <Tabs value={selectedSignalIndex.toString()} onValueChange={(value) => setSelectedSignalIndex(parseInt(value))}>
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-700">
              {displaySignals.slice(0, 3).map((signal, index) => (
                <TabsTrigger 
                  key={index} 
                  value={index.toString()}
                  className="text-xs data-[state=active]:bg-slate-600"
                >
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{signal.assetPair.replace('-USDT', '')}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {displaySignals.slice(0, 3).map((signal, index) => (
              <TabsContent key={index} value={index.toString()}>
                {renderSignalCard(signal)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          primarySignal && renderSignalCard(primarySignal)
        )}
      </CardContent>
    </Card>
  );
};

export default SignalDisplay;
