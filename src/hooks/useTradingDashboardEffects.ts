import { useEffect } from 'react';
import { useActivityLog } from './useActivityLog';
import { setActivityLogger, testProxyConnection } from '@/utils/kucoinProxyApi';
import { apiModeService } from '@/services/apiModeService';

interface TradingDashboardEffectsProps {
  isFirstTimeAfterSetup: boolean;
  decryptedApiKeys: any;
  portfolioData: any;
  loadPortfolioData: (keys: any) => void;
  completeFirstTimeSetup: () => void;
  startSimulation: (portfolioData: any) => Promise<void>;
}

export const useTradingDashboardEffects = ({
  isFirstTimeAfterSetup,
  decryptedApiKeys,
  portfolioData,
  loadPortfolioData,
  completeFirstTimeSetup,
  startSimulation
}: TradingDashboardEffectsProps) => {
  const { 
    addLogEntry, 
    addKucoinSuccessLog, 
    addKucoinErrorLog, 
    addProxyStatusLog 
  } = useActivityLog();

  // Initialize activity logger for kucoinProxyApi
  useEffect(() => {
    setActivityLogger({
      addKucoinSuccessLog,
      addKucoinErrorLog,
      addProxyStatusLog
    });
  }, [addKucoinSuccessLog, addKucoinErrorLog, addProxyStatusLog]);

  // Initialize API modes and test proxy connection on mount
  useEffect(() => {
    const initializeApiServices = async () => {
      addLogEntry('INFO', 'Initialisiere API-Services...');
      
      try {
        // Initialize API mode service
        await apiModeService.initializeApiModes();
        addLogEntry('SUCCESS', 'API-Modi erfolgreich initialisiert');
        
        // Test proxy connection explicitly
        const isProxyConnected = await testProxyConnection();
        if (isProxyConnected) {
          addLogEntry('SUCCESS', 'KuCoin Proxy erfolgreich verbunden');
        } else {
          addLogEntry('WARNING', 'KuCoin Proxy nicht erreichbar - verwende Mock-Daten');
        }
      } catch (error) {
        addLogEntry('ERROR', `Fehler bei API-Initialisierung: ${error.message}`);
      }
    };

    initializeApiServices();
  }, [addLogEntry]);

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

  const handleStartSimulation = async () => {
    if (isFirstTimeAfterSetup) {
      completeFirstTimeSetup();
    }
    addLogEntry('INFO', 'Trading-Simulation gestartet');
    
    if (portfolioData) {
      await startSimulation(portfolioData);
    }
  };

  const handleOpenSettings = () => {
    // This would open settings - for now we'll just complete the first time setup
    if (isFirstTimeAfterSetup) {
      completeFirstTimeSetup();
    }
    addLogEntry('INFO', 'Einstellungen geöffnet');
  };

  return {
    handleStartSimulation,
    handleOpenSettings
  };
};
