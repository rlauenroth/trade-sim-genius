
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

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
}

const SignalDisplay = ({ currentSignal, onAcceptSignal, onIgnoreSignal }: SignalDisplayProps) => {
  if (!currentSignal) return null;

  return (
    <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-400" />
          <span>Neues KI-Signal</span>
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
