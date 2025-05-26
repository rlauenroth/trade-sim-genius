
import { useEffect } from 'react';
import { useActivityLog } from './useActivityLog';

interface TradingDashboardEffectsProps {
  isFirstTimeAfterSetup: boolean;
  decryptedApiKeys: any;
  portfolioData: any;
  loadPortfolioData: (keys: any) => void;
  completeFirstTimeSetup: () => void;
  startSimulation: () => void;
}

export const useTradingDashboardEffects = ({
  isFirstTimeAfterSetup,
  decryptedApiKeys,
  portfolioData,
  loadPortfolioData,
  completeFirstTimeSetup,
  startSimulation
}: TradingDashboardEffectsProps) => {
  const { addLogEntry } = useActivityLog();

  // Load portfolio data on first mount for new users
  useEffect(() => {
    if (isFirstTimeAfterSetup && decryptedApiKeys && !portfolioData) {
      addLogEntry('INFO', 'App erfolgreich initialisiert nach Einrichtung.');
      addLogEntry('INFO', 'Lade Portfolio-Daten von KuCoin...');
      loadPortfolioData(decryptedApiKeys);
    }
  }, [isFirstTimeAfterSetup, decryptedApiKeys, portfolioData, loadPortfolioData, addLogEntry]);

  // Log successful portfolio load
  useEffect(() => {
    if (portfolioData && isFirstTimeAfterSetup) {
      addLogEntry('INFO', `KuCoin Portfolio-Daten erfolgreich geladen. Gesamtwert: $${portfolioData.totalValue.toLocaleString()} USDT.`);
      addLogEntry('INFO', 'App bereit zum Start der ersten Simulation.');
    }
  }, [portfolioData, isFirstTimeAfterSetup, addLogEntry]);

  const handleStartSimulation = () => {
    if (isFirstTimeAfterSetup) {
      completeFirstTimeSetup();
    }
    startSimulation();
  };

  const handleOpenSettings = () => {
    // This would open settings - for now we'll just complete the first time setup
    if (isFirstTimeAfterSetup) {
      completeFirstTimeSetup();
    }
    // TODO: Implement settings modal/page
    addLogEntry('INFO', 'Einstellungen geöffnet (noch nicht implementiert)');
  };

  return {
    handleStartSimulation,
    handleOpenSettings
  };
};
