import { useEffect } from 'react';
import { useActivityLog } from './useActivityLog';
import { setActivityLogger, testProxyConnection } from '@/utils/kucoinProxyApi';
import { apiModeService } from '@/services/apiModeService';
import { useSimGuard } from './useSimGuard';
import { toast } from '@/hooks/use-toast';

interface TradingDashboardEffectsProps {
  isFirstTimeAfterSetup: boolean;
  decryptedApiKeys: any;
  livePortfolio: any;
  loadPortfolioDataWithCredentials: (keys: any) => void;
  completeFirstTimeSetup: () => void;
  startSimulation: (portfolioData: any) => Promise<void>;
}

export const useTradingDashboardEffects = ({
  isFirstTimeAfterSetup,
  decryptedApiKeys,
  livePortfolio,
  loadPortfolioDataWithCredentials,
  completeFirstTimeSetup,
  startSimulation
}: TradingDashboardEffectsProps) => {
  const { 
    addLogEntry, 
    addKucoinSuccessLog, 
    addKucoinErrorLog, 
    addProxyStatusLog 
  } = useActivityLog();

  const { canStart, isRunningBlocked, reason, state } = useSimGuard();

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
    if (isFirstTimeAfterSetup && decryptedApiKeys && !livePortfolio) {
      addLogEntry('INFO', 'App erfolgreich initialisiert nach Einrichtung.');
      addLogEntry('INFO', 'Lade Portfolio-Daten von KuCoin...');
      loadPortfolioDataWithCredentials(decryptedApiKeys);
    }
  }, [isFirstTimeAfterSetup, decryptedApiKeys, livePortfolio, loadPortfolioDataWithCredentials, addLogEntry]);

  // Log successful portfolio load
  useEffect(() => {
    if (livePortfolio && isFirstTimeAfterSetup) {
      addLogEntry('INFO', `KuCoin Portfolio-Daten erfolgreich geladen. Gesamtwert: $${livePortfolio.totalUSDValue.toLocaleString()} USDT.`);
      addLogEntry('INFO', 'App bereit zum Start der ersten Simulation.');
    }
  }, [livePortfolio, isFirstTimeAfterSetup, addLogEntry]);

  const handleStartSimulation = async () => {
    console.log('🚀 Starting simulation...');
    console.log('SimGuard state:', { canStart, isRunningBlocked, reason, state });
    console.log('Live portfolio:', livePortfolio);
    
    // Check SimGuard status first
    if (!canStart) {
      const errorMessage = `Simulation kann nicht gestartet werden: ${reason}`;
      addLogEntry('ERROR', errorMessage);
      toast({
        title: "Simulation nicht möglich",
        description: reason,
        variant: "destructive"
      });
      return;
    }

    if (!livePortfolio) {
      const errorMessage = 'Keine Portfolio-Daten verfügbar. Bitte Portfolio neu laden.';
      addLogEntry('ERROR', errorMessage);
      toast({
        title: "Portfolio-Daten fehlen",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    try {
      if (isFirstTimeAfterSetup) {
        completeFirstTimeSetup();
      }
      
      addLogEntry('INFO', `Trading-Simulation startet mit $${livePortfolio.totalUSDValue} USDT`);
      
      await startSimulation(livePortfolio);
      
      toast({
        title: "Simulation gestartet",
        description: `Portfolio-Wert: $${livePortfolio.totalUSDValue} USDT`
      });
      
    } catch (error) {
      const errorMessage = `Simulation-Start fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
      addLogEntry('ERROR', errorMessage);
      toast({
        title: "Simulation-Fehler",
        description: errorMessage,
        variant: "destructive"
      });
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
