
import { useCallback } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { serviceRegistry } from '@/services/serviceRegistry';
import { simReadinessStore } from '@/stores/simReadiness';
import { toast } from '@/hooks/use-toast';
import { loggingService } from '@/services/loggingService';

interface DashboardActionsProps {
  handleStartSimulationFromEffects: () => void;
  isInitialized: boolean;
  initializationError: string | null;
  isRealTradingMode: boolean;
  isSimulationActive: boolean;
  logPerformanceReport: () => void;
  retryRealTradingInit: () => void;
}

export const useDashboardActions = ({
  handleStartSimulationFromEffects,
  isInitialized,
  initializationError,
  isRealTradingMode,
  isSimulationActive,
  logPerformanceReport,
  retryRealTradingInit
}: DashboardActionsProps) => {
  const { settings } = useSettingsV2Store();

  // Enhanced start simulation with improved validation
  const handleStartSimulation = useCallback(() => {
    console.log('🚀 DashboardStateManager: Starting simulation with enhanced validation...');
    
    if (!isInitialized) {
      loggingService.logError('Cannot start simulation - dashboard not initialized', {
        initializationError,
        tradingMode: settings.tradingMode
      });
      toast({
        title: "Initialisierung erforderlich",
        description: "Dashboard wird noch initialisiert, bitte warten Sie einen Moment",
        variant: "destructive"
      });
      return;
    }

    if (initializationError) {
      toast({
        title: "Initialisierungsfehler",
        description: `Kann Simulation nicht starten: ${initializationError}`,
        variant: "destructive"
      });
      return;
    }

    // Check service readiness
    const essentialServices = ['portfolioService'];
    if (isRealTradingMode) {
      essentialServices.push('realTradingService');
    }

    if (!serviceRegistry.getAllServicesReady(essentialServices)) {
      toast({
        title: "Services nicht bereit",
        description: "Warten Sie, bis alle Services initialisiert sind",
        variant: "destructive"
      });
      return;
    }
    
    try {
      handleStartSimulationFromEffects();
    } catch (error) {
      console.error('❌ Error starting simulation:', error);
      loggingService.logError('Simulation start failed in DashboardStateManager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tradingMode: settings.tradingMode
      });
      toast({
        title: "Simulation-Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    }
  }, [handleStartSimulationFromEffects, settings, isInitialized, initializationError, isRealTradingMode]);

  // Enhanced manual refresh with service status check
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered from Dashboard (enhanced)');
    
    loggingService.logInfo('Manual refresh initiated', {
      tradingMode: settings.tradingMode,
      selectedModel: settings.model.id,
      hasSimulation: isSimulationActive,
      isInitialized,
      servicesStatus: serviceRegistry.getServicesStatus()
    });
    
    simReadinessStore.forceRefresh();
    
    // Retry failed services
    const failedServices = serviceRegistry.getServicesStatus().filter(s => s.error);
    failedServices.forEach(service => {
      if (service.name === 'realTradingService' && isRealTradingMode) {
        retryRealTradingInit();
      }
    });
    
    if (isSimulationActive) {
      logPerformanceReport();
    }
    
    toast({
      title: "Daten aktualisiert",
      description: "Portfolio und Services werden neu geladen",
    });
  }, [isSimulationActive, logPerformanceReport, settings.tradingMode, settings.model.id, isInitialized, isRealTradingMode, retryRealTradingInit]);

  // Simple logout function with enhanced cleanup
  const logoutAndClearData = useCallback(() => {
    console.log('🚪 Logout and clear data called (enhanced)');
    loggingService.logInfo('User logout initiated', {
      tradingMode: settings.tradingMode
    });
    
    // Clear service registry
    serviceRegistry.clear();
    
    localStorage.clear();
    window.location.reload();
  }, [settings.tradingMode]);

  return {
    handleStartSimulation,
    handleManualRefresh,
    logoutAndClearData
  };
};
