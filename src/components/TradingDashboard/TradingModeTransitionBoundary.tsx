
import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loggingService } from '@/services/loggingService';

interface Props {
  children: ReactNode;
  tradingMode: 'simulation' | 'real';
  onRetry?: () => void;
  onResetToSimulation?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class TradingModeTransitionBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    loggingService.logError('Trading mode transition error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      tradingMode: this.props.tradingMode,
      timestamp: Date.now()
    });

    console.error('Trading Mode Transition Error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when trading mode changes
    if (prevProps.tradingMode !== this.props.tradingMode && this.state.hasError) {
      this.setState({ hasError: false, error: undefined, retryCount: 0 });
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    loggingService.logEvent('SIM', 'Trading mode transition retry attempted', {
      retryCount: newRetryCount,
      tradingMode: this.props.tradingMode
    });

    this.setState({ 
      hasError: false, 
      error: undefined,
      retryCount: newRetryCount
    });

    // Call parent retry handler if provided
    this.props.onRetry?.();
  };

  handleResetToSimulation = () => {
    loggingService.logEvent('SIM', 'Reset to simulation mode requested', {
      originalTradingMode: this.props.tradingMode,
      retryCount: this.state.retryCount
    });

    this.props.onResetToSimulation?.();
  };

  render() {
    if (this.state.hasError) {
      const isRealTradingError = this.props.tradingMode === 'real';

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                Trading-Modus Transition Fehler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Es ist ein Fehler beim Wechsel zum {this.props.tradingMode === 'real' ? 'Real-Trading' : 'Simulations'}-Modus aufgetreten.
                {this.state.retryCount > 0 && ` (Versuch ${this.state.retryCount + 1})`}
              </p>
              
              {isRealTradingError && (
                <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-3">
                  <p className="text-orange-300 text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    Dieser Fehler kann auftreten, wenn Real-Trading-Services nicht korrekt initialisiert wurden.
                  </p>
                </div>
              )}
              
              {this.state.error && (
                <div className="bg-slate-900 p-3 rounded text-sm text-red-300 font-mono max-h-32 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.handleRetry}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
                
                {isRealTradingError && this.props.onResetToSimulation && (
                  <Button 
                    onClick={this.handleResetToSimulation}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Zurück zu Simulation
                  </Button>
                )}
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-slate-600"
                >
                  Seite neu laden
                </Button>
              </div>
              
              <p className="text-xs text-slate-500">
                Der Fehler wurde automatisch protokolliert. Falls das Problem weiterhin besteht, 
                wechseln Sie zurück zum Simulations-Modus.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
