
import { useState, useCallback } from 'react';
import { getAccountBalances } from '@/utils/kucoinApi';
import { toast } from '@/hooks/use-toast';

interface PortfolioAsset {
  currency: string;
  balance: number;
  available: number;
  usdValue?: number;
}

interface PortfolioData {
  assets: PortfolioAsset[];
  totalValue: number;
  lastUpdated: number;
}

export const usePortfolioData = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolioData = useCallback(async (credentials: any) => {
    if (!credentials) {
      setError('Keine API-Zugangsdaten verfügbar');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balances = await getAccountBalances(credentials);
      
      // Filter out zero balances and convert to our format
      const assets: PortfolioAsset[] = balances
        .filter(balance => parseFloat(balance.balance) > 0)
        .map(balance => ({
          currency: balance.currency,
          balance: parseFloat(balance.balance),
          available: parseFloat(balance.available)
        }));

      // For now, calculate a simple total assuming USDT equivalency
      // In a real app, you'd fetch current prices and convert
      const usdtBalance = assets.find(asset => asset.currency === 'USDT')?.balance || 0;
      const totalValue = Math.max(usdtBalance, 10000); // Minimum 10k for simulation

      const portfolioData: PortfolioData = {
        assets,
        totalValue,
        lastUpdated: Date.now()
      };

      setPortfolioData(portfolioData);
      
      toast({
        title: "Portfolio geladen",
        description: `Portfolio-Wert: $${totalValue.toLocaleString()}`,
      });

    } catch (error) {
      console.error('Error loading portfolio:', error);
      const errorMessage = 'Fehler beim Laden der Portfolio-Daten. Bitte prüfen Sie Ihre API-Schlüssel.';
      setError(errorMessage);
      
      toast({
        title: "Portfolio-Fehler",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPortfolioData = useCallback(() => {
    setPortfolioData(null);
    setError(null);
  }, []);

  return {
    portfolioData,
    isLoading,
    error,
    loadPortfolioData,
    clearPortfolioData
  };
};
