
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortfolioLoadingCardProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const PortfolioLoadingCard = ({ isLoading, error, onRetry }: PortfolioLoadingCardProps) => {
  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
            <div className="text-white font-medium">Portfolio-Daten werden geladen...</div>
            <div className="text-slate-400 text-sm">
              Bitte warten Sie, während wir Ihre KuCoin-Portfolio-Daten abrufen.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-600/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span>Portfolio-Ladefehler</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-red-200 text-sm">
            {error}
          </div>
          
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              className="border-red-600/50 text-red-300 hover:bg-red-900/30"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Erneut versuchen
            </Button>
          )}
          
          <div className="text-xs text-red-300/70 bg-red-900/20 border border-red-600/30 rounded p-2">
            💡 Tipp: Überprüfen Sie Ihre API-Schlüssel in den Einstellungen, wenn das Problem weiterhin besteht.
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default PortfolioLoadingCard;
