
import { useState, useCallback, useRef } from 'react';
import { Signal } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';
import { useAIValidation } from './useAIValidation';
import { useMarketScreening } from './useMarketScreening';
import { useCandidates } from '@/hooks/useCandidates';

export const useSignalGeneration = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [availableSignals, setAvailableSignals] = useState<Signal[]>([]);
  const [isFetchingSignals, setIsFetchingSignals] = useState(false);
  const lastGenerationTime = useRef<number>(0);
  
  const { validateAPIKeys } = useAIValidation();
  const { performScreeningAndAnalysis } = useMarketScreening();
  const { clearCandidates } = useCandidates();

  // Helper function to extract portfolio data from multiple sources
  const extractPortfolioData = (simulationState: any, livePortfolioData?: any) => {
    loggingService.logEvent('AI', 'Extracting portfolio data for AI analysis', {
      hasSimulationState: !!simulationState,
      hasLivePortfolio: !!livePortfolioData,
      simulationStateKeys: simulationState ? Object.keys(simulationState) : [],
      livePortfolioKeys: livePortfolioData ? Object.keys(livePortfolioData) : []
    });

    // Try to get portfolio value from simulation state first
    let portfolioValue = simulationState?.currentPortfolioValue || simulationState?.startPortfolioValue;
    
    // Fallback to live portfolio data
    if (!portfolioValue && livePortfolioData) {
      portfolioValue = livePortfolioData.totalValue || livePortfolioData.totalUSDValue;
    }

    // Try to get available USDT from simulation state
    let availableUSDT = simulationState?.paperAssets?.find((asset: any) => asset.symbol === 'USDT')?.quantity;
    
    // Fallback: if no paperAssets or USDT not found, use portfolio value as available USDT
    if (!availableUSDT && portfolioValue) {
      availableUSDT = portfolioValue;
      loggingService.logEvent('AI', 'Using portfolio value as available USDT fallback', {
        portfolioValue,
        availableUSDT
      });
    }

    // Fallback to live portfolio USDT position
    if (!availableUSDT && livePortfolioData?.positions) {
      const usdtPosition = livePortfolioData.positions.find((pos: any) => 
        pos.currency === 'USDT' || pos.symbol === 'USDT'
      );
      if (usdtPosition) {
        availableUSDT = usdtPosition.balance || usdtPosition.quantity;
      }
    }

    loggingService.logEvent('AI', 'Portfolio data extraction completed', {
      portfolioValue,
      availableUSDT,
      simulationStateStructure: {
        currentPortfolioValue: simulationState?.currentPortfolioValue,
        startPortfolioValue: simulationState?.startPortfolioValue,
        paperAssetsCount: simulationState?.paperAssets?.length || 0,
        paperAssets: simulationState?.paperAssets?.map((asset: any) => ({
          symbol: asset.symbol,
          quantity: asset.quantity
        })) || []
      }
    });

    return { portfolioValue, availableUSDT };
  };

  const generateSignals = useCallback(async (
    isActive: boolean, 
    simulationState: any, 
    addLogEntry: (type: any, message: string) => void,
    executeAutoTrade?: (signal: Signal, simulationState: any, updateSimulationState: any, addLogEntry: any) => Promise<boolean>,
    updateSimulationState?: (state: any) => void,
    livePortfolioData?: any  // Add optional live portfolio data parameter
  ) => {
    // Guard against multiple concurrent executions
    if (isFetchingSignals) {
      console.log('🔄 Signal generation skipped - already in progress');
      return;
    }

    // Debounce rapid calls
    const now = Date.now();
    const timeSinceLastGeneration = now - lastGenerationTime.current;
    if (timeSinceLastGeneration < 10000) {
      console.log('🔄 Signal generation debounced - too frequent calls');
      return;
    }

    if (!isActive) {
      console.log('🔄 Signal generation skipped - simulation inactive');
      return;
    }

    setIsFetchingSignals(true);
    lastGenerationTime.current = now;
    
    try {
      // Clear candidates at start of new cycle
      clearCandidates();
      
      console.log('🚀 Starting comprehensive AI market analysis with auto-execution:', {
        portfolioValue: simulationState?.currentPortfolioValue,
        availableUSDT: simulationState?.paperAssets?.find((asset: any) => asset.symbol === 'USDT')?.quantity,
        openPositions: simulationState?.openPositions?.length || 0,
        hasAutoExecution: !!executeAutoTrade,
        hasLivePortfolioFallback: !!livePortfolioData
      });
      
      addLogEntry('AI', 'Starte KI-Analyse mit automatischer Ausführung...');
      
      // Validate API keys
      const validation = validateAPIKeys(addLogEntry);
      if (!validation.isValid) {
        return;
      }

      // Extract portfolio data with fallbacks
      const { portfolioValue, availableUSDT } = extractPortfolioData(simulationState, livePortfolioData);
      
      if (!portfolioValue || !availableUSDT) {
        loggingService.logError('Portfolio data extraction failed', {
          portfolioValue,
          availableUSDT,
          simulationState,
          livePortfolioData
        });
        addLogEntry('ERROR', 'Portfolio-Daten nicht verfügbar für KI-Analyse');
        return;
      }

      loggingService.logSuccess('Portfolio data successfully extracted for AI analysis', {
        portfolioValue,
        availableUSDT,
        dataSource: simulationState?.currentPortfolioValue ? 'simulation' : 'live_portfolio'
      });

      // Perform market screening and signal generation
      const result = await performScreeningAndAnalysis({
        portfolioValue,
        availableUSDT,
        strategy: validation.strategy!,
        openRouterApiKey: validation.openRouterApiKey!,
        kucoinKeys: validation.kucoinKeys!
      }, addLogEntry);

      const { signals } = result;
      
      console.log('📊 Signal generation completed:', {
        signalsGenerated: signals.length,
        actionableSignals: signals.filter(s => s.signalType === 'BUY' || s.signalType === 'SELL').length
      });
      
      if (signals.length > 0) {
        // Filter for actionable signals only
        const actionableSignals = signals.filter(s => s.signalType === 'BUY' || s.signalType === 'SELL');
        
        if (actionableSignals.length > 0) {
          setAvailableSignals(actionableSignals);
          
          const primarySignal = actionableSignals[0];
          setCurrentSignal(primarySignal);
          
          addLogEntry('AI', `${actionableSignals.length} handelbare Signale generiert`);
          addLogEntry('AI', `Primär-Signal: ${primarySignal.signalType} ${primarySignal.assetPair}`);
          
          // Auto-execute the primary signal if executeAutoTrade is provided
          if (executeAutoTrade && updateSimulationState && simulationState) {
            addLogEntry('AUTO_TRADE', `Automatische Ausführung startet: ${primarySignal.signalType} ${primarySignal.assetPair}`);
            
            try {
              const success = await executeAutoTrade(primarySignal, simulationState, updateSimulationState, addLogEntry);
              
              if (success) {
                addLogEntry('SUCCESS', `Auto-Trade erfolgreich: ${primarySignal.signalType} ${primarySignal.assetPair}`);
                // Clear the current signal after successful execution
                setCurrentSignal(null);
              } else {
                addLogEntry('WARNING', `Auto-Trade fehlgeschlagen: ${primarySignal.assetPair}`);
              }
            } catch (error) {
              addLogEntry('ERROR', `Auto-Trade Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
            }
          }
          
          if (primarySignal.reasoning) {
            addLogEntry('AI', `KI-Begründung: ${primarySignal.reasoning}`);
          }
        } else {
          addLogEntry('INFO', 'Keine handelbaren Signale in diesem Zyklus');
          setAvailableSignals([]);
          setCurrentSignal(null);
        }
      } else {
        addLogEntry('INFO', 'Keine Signale generiert');
        setAvailableSignals([]);
        setCurrentSignal(null);
      }
      
    } catch (error) {
      console.error('❌ AI signal generation error:', error);
      addLogEntry('ERROR', `KI-Service Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setAvailableSignals([]);
      setCurrentSignal(null);
    } finally {
      setIsFetchingSignals(false);
    }
  }, [validateAPIKeys, performScreeningAndAnalysis, clearCandidates, isFetchingSignals]);

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    generateSignals,
    isFetchingSignals
  };
};
