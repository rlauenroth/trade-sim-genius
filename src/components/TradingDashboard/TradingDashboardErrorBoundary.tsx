
import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { loggingService } from '@/services/loggingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  retryCount: number;
}

export class TradingDashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TradingDashboard Error:', error, errorInfo);
    
    // Enhanced error logging with context
    loggingService.logError('Trading Dashboard crashed', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack
    });
  }

  handleReset = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    loggingService.logEvent('SIM', 'Dashboard error boundary reset attempted', {
      retryCount: newRetryCount,
      timestamp: Date.now()
    });

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: newRetryCount
    });
    
    // If multiple retries failed, suggest more drastic measures
    if (newRetryCount >= 3) {
      setTimeout(() => {
        if (this.state.hasError) {
          if (confirm('Mehrere Wiederherstellungsversuche fehlgeschlagen. App komplett neu laden?')) {
            window.location.reload();
          }
        }
      }, 1000);
    }
  };

  handleResetToSimulation = () => {
    try {
      // Force trading mode back to simulation
      const currentSettings = JSON.parse(localStorage.getItem('kiTradingApp_settingsV2') || '{}');
      currentSettings.settings = {
        ...currentSettings.settings,
        tradingMode: 'simulation'
      };
      localStorage.setItem('kiTradingApp_settingsV2', JSON.stringify(currentSettings));
      
      loggingService.logEvent('SIM', 'Forced reset to simulation mode due to error', {
        timestamp: Date.now(),
        retryCount: this.state.retryCount
      });
      
      window.location.reload();
    } catch (resetError) {
      console.error('Failed to reset to simulation mode:', resetError);
      // Fallback to full reload
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRealTradingError = this.state.error?.message?.includes('real') || 
                                this.state.error?.message?.includes('Risk') ||
                                this.state.error?.message?.includes('trading');

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Dashboard Fehler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Es ist ein unerwarteter Fehler beim Laden des Dashboards aufgetreten. 
                {this.state.retryCount > 0 && ` (Versuch ${this.state.retryCount + 1})`}
              </p>
              
              {isRealTradingError && (
                <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-3">
                  <p className="text-orange-300 text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    Dieser Fehler scheint mit dem Real-Trading-Modus zusammenzuhängen. 
                    Versuchen Sie, zurück zum Simulations-Modus zu wechseln.
                  </p>
                </div>
              )}
              
              {this.state.error && (
                <div className="bg-slate-900 p-3 rounded text-sm text-red-300 font-mono max-h-32 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <Button 
                    onClick={this.handleReset}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Dashboard neu laden
                  </Button>
                  
                  {isRealTradingError && (
                    <Button 
                      onClick={this.handleResetToSimulation}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Zurück zu Simulation
                    </Button>
                  )}
                </div>
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-slate-600"
                >
                  Seite komplett neu laden
                </Button>
              </div>
              
              <p className="text-xs text-slate-500">
                Falls das Problem weiterhin besteht, überprüfen Sie Ihre Einstellungen 
                oder wenden Sie sich an den Support. Fehler #{this.state.retryCount + 1}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
