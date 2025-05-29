
import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { loggingService } from '@/services/loggingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class TradingDashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TradingDashboard Error:', error, errorInfo);
    
    // Log the error to our logging service
    loggingService.logError('Trading Dashboard crashed', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now()
    });

    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Force a page reload as last resort
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.reload();
      }
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

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
                Dies kann durch eine fehlerhafte Konfiguration oder einen Systemfehler verursacht werden.
              </p>
              
              {this.state.error && (
                <div className="bg-slate-900 p-3 rounded text-sm text-red-300 font-mono">
                  {this.state.error.message}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Dashboard neu laden
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-slate-600"
                >
                  Seite neu laden
                </Button>
              </div>
              
              <p className="text-xs text-slate-500">
                Falls das Problem weiterhin besteht, überprüfen Sie Ihre Einstellungen 
                oder wenden Sie sich an den Support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
