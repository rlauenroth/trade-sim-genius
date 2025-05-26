
import { useState, useCallback } from 'react';
import { getAccountBalances, getCurrentPrice } from '@/utils/kucoinApi';
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
      console.log('Lade Portfolio-Daten von KuCoin...');
      const balances = await getAccountBalances(credentials);
      
      // Filter out zero balances and convert to our format
      const assets: PortfolioAsset[] = balances
        .filter(balance => parseFloat(balance.balance) > 0)
        .map(balance => ({
          currency: balance.currency,
          balance: parseFloat(balance.balance),
          available: parseFloat(balance.available)
        }));

      console.log(`${assets.length} Assets mit Guthaben gefunden:`, assets);

      // Calculate USD value for major assets
      let totalValue = 0;
      
      // USDT value directly
      const usdtAsset = assets.find(asset => asset.currency === 'USDT');
      if (usdtAsset) {
        usdtAsset.usdValue = usdtAsset.balance;
        totalValue += usdtAsset.balance;
      }

      // For other major cryptocurrencies, try to get current price
      const majorCryptos = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT'];
      for (const asset of assets.filter(a => majorCryptos.includes(a.currency))) {
        try {
          const price = await getCurrentPrice(credentials, `${asset.currency}-USDT`);
          asset.usdValue = asset.balance * price;
          totalValue += asset.usdValue;
          console.log(`${asset.currency}: $${asset.usdValue.toFixed(2)} (${asset.balance} * $${price})`);
        } catch (priceError) {
          console.warn(`Preis für ${asset.currency} konnte nicht abgerufen werden:`, priceError);
          // Fallback: Assume 0 USD value for unknown assets
          asset.usdValue = 0;
        }
      }

      // Ensure minimum portfolio value for simulation purposes
      if (totalValue < 1000) {
        console.log(`Portfolio-Wert von $${totalValue} zu niedrig für Simulation. Setze Mindestwert von $10,000.`);
        totalValue = 10000;
      }

      const portfolioData: PortfolioData = {
        assets,
        totalValue,
        lastUpdated: Date.now()
      };

      setPortfolioData(portfolioData);
      
      toast({
        title: "Portfolio erfolgreich geladen",
        description: `Gesamtwert: $${totalValue.toLocaleString()} aus ${assets.length} Assets`,
      });

      console.log('Portfolio-Daten erfolgreich geladen:', portfolioData);

    } catch (error) {
      console.error('Fehler beim Laden der Portfolio-Daten:', error);
      
      let errorMessage = 'Fehler beim Laden der Portfolio-Daten.';
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Ungültige API-Schlüssel. Bitte überprüfen Sie Ihre KuCoin API-Zugangsdaten.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
        } else {
          errorMessage = `API-Fehler: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      
      toast({
        title: "Portfolio-Ladefehler",
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

  const refreshPortfolioData = useCallback(async (credentials: any) => {
    console.log('Portfolio-Daten werden aktualisiert...');
    await loadPortfolioData(credentials);
  }, [loadPortfolioData]);

  return {
    portfolioData,
    isLoading,
    error,
    loadPortfolioData,
    clearPortfolioData,
    refreshPortfolioData
  };
};
