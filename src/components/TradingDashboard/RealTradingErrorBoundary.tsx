
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loggingService } from '@/services/loggingService';

interface Props {
  children: ReactNode;
  tradingMode: 'simulation' | 'real';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RealTradingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log the error
    loggingService.logError('Real Trading Mode Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      tradingMode: this.props.tradingMode
    });

    console.error('Real Trading Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Try to reset to simulation mode
    try {
      localStorage.setItem('kiTradingApp_settingsV2', JSON.stringify({
        ...JSON.parse(localStorage.getItem('kiTradingApp_settingsV2') || '{}'),
        tradingMode: 'simulation'
      }));
      
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset trading mode:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-700 max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Real-Trading-Modus Fehler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-slate-300">
                <p className="mb-2">
                  Ein Fehler ist im Real-Trading-Modus aufgetreten. Dies kann passieren, wenn:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                  <li>Die Risk-Limits nicht korrekt initialisiert wurden</li>
                  <li>Die API-Verbindung unterbrochen ist</li>
                  <li>Die Settings nicht vollständig geladen wurden</li>
                </ul>
              </div>
              
              {this.state.error && (
                <div className="bg-red-900/20 border border-red-500/20 rounded p-3">
                  <p className="text-red-300 text-sm font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.handleReset}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Zurück zum Simulations-Modus
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Seite neu laden
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                Der Fehler wurde automatisch protokolliert. Bei wiederholten Problemen wechseln Sie bitte zurück zum Simulations-Modus.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RealTradingErrorBoundary;
