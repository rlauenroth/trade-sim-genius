
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock, TrendingUp, CheckCircle, AlertTriangle, Play, Pause } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Signal } from '@/types/simulation';
import { SignalState } from '@/hooks/useSignalStateMachine';

interface EnhancedSignalDisplayProps {
  currentSignal: Signal | null;
  signalState: SignalState;
  availableSignals?: Signal[];
  portfolioValue?: number;
  onForceReset?: () => void;
}

const EnhancedSignalDisplay = ({ 
  currentSignal, 
  signalState,
  availableSignals = [], 
  portfolioValue,
  onForceReset
}: EnhancedSignalDisplayProps) => {
  const [displayTimeout, setDisplayTimeout] = useState<NodeJS.Timeout | null>(null);
  const [stateAge, setStateAge] = useState<number>(0);

  // Track state age for timeout detection
  useEffect(() => {
    const interval = setInterval(() => {
      setStateAge(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset state age when signal state changes
  useEffect(() => {
    setStateAge(0);
  }, [signalState]);

  // Auto-clear display timeout for failed states
  useEffect(() => {
    if (signalState === 'FAILED' || signalState === 'EXECUTED') {
      const timeout = setTimeout(() => {
        if (onForceReset) {
          console.log('🔄 Auto-clearing failed/executed signal display');
          onForceReset();
        }
      }, signalState === 'EXECUTED' ? 3000 : 8000);
      
      setDisplayTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [signalState, onForceReset]);

  // State-specific styling and content
  const getStateConfig = () => {
    switch (signalState) {
      case 'IDLE':
        return {
          borderColor: 'border-slate-700',
          headerBg: 'bg-slate-800',
          title: 'KI-Signal Status',
          subtitle: 'Warte auf handelbare Signale...',
          icon: Clock,
          iconColor: 'text-slate-400',
          showSignal: false
        };
      case 'GENERATED':
        return {
          borderColor: 'border-blue-500',
          headerBg: 'bg-blue-900/20',
          title: 'Neues KI-Signal',
          subtitle: 'Signal generiert - wird verarbeitet...',
          icon: Bot,
          iconColor: 'text-blue-400',
          showSignal: true
        };
      case 'PROCESSING':
        return {
          borderColor: 'border-yellow-500',
          headerBg: 'bg-yellow-900/20',
          title: 'Signal wird ausgeführt',
          subtitle: 'Trade-Ausführung läuft...',
          icon: Play,
          iconColor: 'text-yellow-400 animate-pulse',
          showSignal: true
        };
      case 'EXECUTED':
        return {
          borderColor: 'border-green-500',
          headerBg: 'bg-green-900/20',
          title: 'Signal ausgeführt',
          subtitle: 'Trade erfolgreich abgeschlossen',
          icon: CheckCircle,
          iconColor: 'text-green-400',
          showSignal: true
        };
      case 'FAILED':
        return {
          borderColor: 'border-red-500',
          headerBg: 'bg-red-900/20',
          title: 'Signal fehlgeschlagen',
          subtitle: 'Trade-Ausführung nicht erfolgreich',
          icon: AlertTriangle,
          iconColor: 'text-red-400',
          showSignal: true
        };
      case 'CLEARED':
        return {
          borderColor: 'border-slate-700',
          headerBg: 'bg-slate-800',
          title: 'Signal abgeschlossen',
          subtitle: 'Bereit für nächstes Signal...',
          icon: CheckCircle,
          iconColor: 'text-slate-400',
          showSignal: false
        };
      default:
        return {
          borderColor: 'border-slate-700',
          headerBg: 'bg-slate-800',
          title: 'Unbekannter Status',
          subtitle: 'System-Fehler',
          icon: AlertTriangle,
          iconColor: 'text-red-400',
          showSignal: false
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  // Show timeout warning for stuck states
  const showTimeoutWarning = stateAge > 30 && (signalState === 'PROCESSING' || signalState === 'GENERATED');

  // Render signal details
  const renderSignalDetails = () => {
    if (!currentSignal || !config.showSignal) return null;

    return (
      <div className="space-y-4">
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

        {currentSignal.confidenceScore && (
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Konfidenz:</span>
            <span className="text-white font-medium">{Math.round(currentSignal.confidenceScore * 100)}%</span>
          </div>
        )}

        {currentSignal.reasoning && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">KI-Begründung:</div>
            <div className="text-sm text-slate-200">{currentSignal.reasoning}</div>
          </div>
        )}

        {/* State-specific status indicator */}
        <div className={`flex items-center justify-center py-3 rounded-lg border ${config.borderColor}/30 ${config.headerBg}`}>
          <Icon className={`h-5 w-5 ${config.iconColor} mr-2`} />
          <span className={`${config.iconColor} font-medium`}>
            {config.subtitle}
          </span>
          {stateAge > 0 && (
            <span className="text-xs text-slate-500 ml-2">
              ({stateAge}s)
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="text-center py-6">
      <Icon className={`h-8 w-8 ${config.iconColor} mx-auto mb-3`} />
      <div className="text-slate-400 mb-2">{config.subtitle}</div>
      <div className="text-sm text-slate-500">
        {signalState === 'IDLE' ? 'Nur echte KI-Analysen werden angezeigt' : 'System bereit für neue Signale'}
      </div>
    </div>
  );

  return (
    <Card className={`bg-slate-800 border-4 ${config.borderColor}`}>
      <CardHeader className={config.headerBg}>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            <span>{config.title}</span>
            <Badge className="bg-blue-600 text-xs">AUTO-MODUS</Badge>
          </div>
          
          {showTimeoutWarning && onForceReset && (
            <button 
              onClick={onForceReset}
              className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
            >
              Reset
            </button>
          )}
        </CardTitle>
        
        {/* Additional state info */}
        {availableSignals.length > 1 && (
          <Badge variant="outline" className="text-xs w-fit">
            {availableSignals.length} verfügbare Signale
          </Badge>
        )}
      </CardHeader>
      
      <CardContent>
        {config.showSignal && currentSignal ? renderSignalDetails() : renderEmptyState()}
        
        {/* Timeout warning */}
        {showTimeoutWarning && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Signal-Verarbeitung dauert ungewöhnlich lange ({stateAge}s)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedSignalDisplay;
