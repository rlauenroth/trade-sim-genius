
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useRiskManagement } from '@/hooks/useRiskManagement';
import { useAppState } from '@/hooks/useAppState';

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
  onAcceptSignal: (signal: Signal) => void;
  onIgnoreSignal: (signal: Signal) => void;
  portfolioValue?: number;
}

const SignalDisplay = ({ currentSignal, onAcceptSignal, onIgnoreSignal, portfolioValue }: SignalDisplayProps) => {
  const { userSettings } = useAppState();
  const { getTradeDisplayInfo } = useRiskManagement(userSettings.tradingStrategy || 'balanced');

  if (!currentSignal) {
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
            <div className="text-slate-400 mb-2">Kein Signal im aktuellen Intervall</div>
            <div className="text-sm text-slate-500">
              Nur echte KI-Analysen werden angezeigt - keine Demo-Signale
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayInfo = portfolioValue ? getTradeDisplayInfo(portfolioValue, userSettings.tradingStrategy || 'balanced') : null;

  return (
    <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-400" />
          <span>Echtes KI-Signal</span>
          <Badge className="bg-green-600 text-xs">LIVE</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-slate-400">Asset</div>
            <div className="font-bold text-white">{currentSignal.assetPair}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Aktion</div>
            <Badge className={currentSignal.signalType === 'BUY' ? 'bg-green-600' : 'bg-red-600'}>
              {currentSignal.signalType === 'BUY' ? 'KAUFEN' : 'VERKAUFEN'}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-slate-400">Ziel</div>
            <div className="text-white">{formatCurrency(currentSignal.takeProfitPrice)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Stop-Loss</div>
            <div className="text-white">{formatCurrency(currentSignal.stopLossPrice)}</div>
          </div>
        </div>

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
        
        {currentSignal.reasoning && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">KI-Begründung:</div>
            <div className="text-sm text-slate-200">{currentSignal.reasoning}</div>
          </div>
        )}
        
        <div className="flex space-x-3">
          <Button 
            onClick={() => onAcceptSignal(currentSignal)} 
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Signal für Simulation annehmen
          </Button>
          <Button 
            onClick={() => onIgnoreSignal(currentSignal)} 
            variant="outline" 
            className="flex-1 border-slate-600 text-slate-300"
          >
            Signal ignorieren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalDisplay;
