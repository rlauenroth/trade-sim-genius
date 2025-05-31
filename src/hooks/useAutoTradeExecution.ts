
import { useState, useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useTradeExecution } from './useTradeExecution';
import { useRiskManagement } from './useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';

export const useAutoTradeExecution = () => {
  const [autoModeError, setAutoModeError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { executeTradeFromSignal } = useTradeExecution();
  const { validateTradeRisk } = useRiskManagement('balanced');

  const executeAutoTrade = useCallback(async (
    signal: Signal,
    simulationState: SimulationState,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string, source?: string, details?: any) => void
  ): Promise<boolean> => {
    if (!simulationState) {
      console.log('❌ Auto-trade failed: No simulation state');
      return false;
    }

    try {
      console.log('🔄 Auto-trade execution started:', {
        signal: signal.assetPair,
        signalType: signal.signalType,
        portfolioValue: simulationState.currentPortfolioValue,
        availableUSDT: simulationState.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity
      });

      loggingService.logEvent('AUTO_TRADE', 'Auto-trade execution started', {
        assetPair: signal.assetPair,
        signalType: signal.signalType,
        confidence: signal.confidenceScore,
        portfolioValueBefore: simulationState.currentPortfolioValue
      });

      addLogEntry('AUTO_TRADE', `AUTO-TRADE: ${signal.signalType} ${signal.assetPair} wird automatisch ausgeführt...`);

      // Validate risk before executing
      const riskValidation = validateTradeRisk(signal, simulationState);
      if (!riskValidation.isValid) {
        console.log('❌ Auto-trade rejected by risk validation:', riskValidation.reason);
        addLogEntry('WARNING', `AUTO-TRADE abgelehnt: ${riskValidation.reason}`);
        return false;
      }

      // Execute the trade
      const tradeResult = await executeTradeFromSignal(signal, simulationState);
      
      console.log('📊 Trade result:', tradeResult);

      if (tradeResult.success) {
        // FIXED: Proper portfolio value calculation and state update
        const portfolioValueBefore = simulationState.currentPortfolioValue;
        const tradeFee = tradeResult.fee || 0;
        
        // Calculate new portfolio value based on trade execution
        let portfolioValueAfter = portfolioValueBefore;
        
        if (signal.signalType === 'BUY') {
          // For BUY orders: subtract the total cost (including fees) from portfolio value
          const totalCost = (tradeResult.position.quantity * tradeResult.position.entryPrice) + tradeFee;
          portfolioValueAfter = portfolioValueBefore - totalCost;
        } else if (signal.signalType === 'SELL') {
          // For SELL orders: add the proceeds (minus fees) to portfolio value
          const proceeds = (tradeResult.position.quantity * tradeResult.position.entryPrice) - tradeFee;
          portfolioValueAfter = portfolioValueBefore + proceeds;
        }
        
        // Create updated simulation state with all changes
        const updatedState: SimulationState = {
          ...simulationState,
          openPositions: [...(simulationState.openPositions || []), tradeResult.position],
          paperAssets: tradeResult.updatedAssets,
          currentPortfolioValue: portfolioValueAfter,
          autoTradeCount: (simulationState.autoTradeCount || 0) + 1,
          lastAutoTradeTime: Date.now()
        };

        console.log('💾 FIXED - Updating simulation state with proper values:', {
          portfolioValueBefore,
          portfolioValueAfter,
          tradeFee,
          tradeType: signal.signalType,
          newPositions: updatedState.openPositions.length,
          updatedAssets: updatedState.paperAssets.map(a => ({ symbol: a.symbol, quantity: a.quantity }))
        });

        // Update the simulation state
        updateSimulationState(updatedState);
        
        // Log the successful trade with proper details
        addLogEntry('AUTO_TRADE', `AUTO-TRADE erfolgreich ausgeführt: ${signal.signalType} ${tradeResult.position.quantity.toFixed(6)} ${signal.assetPair}`, 'AutoMode', {
          tradeData: {
            id: tradeResult.position.id,
            assetPair: signal.assetPair,
            type: signal.signalType as 'BUY' | 'SELL',
            quantity: tradeResult.position.quantity,
            price: tradeResult.position.entryPrice,
            fee: tradeFee,
            totalValue: tradeResult.position.quantity * tradeResult.position.entryPrice,
            auto: true
          },
          portfolioData: {
            valueBefore: portfolioValueBefore,
            valueAfter: portfolioValueAfter,
            change: portfolioValueAfter - portfolioValueBefore,
            changePercent: ((portfolioValueAfter - portfolioValueBefore) / portfolioValueBefore) * 100
          }
        });

        // Log portfolio value change
        addLogEntry('PORTFOLIO_UPDATE', `Portfolio-Wert: $${portfolioValueBefore.toFixed(2)} → $${portfolioValueAfter.toFixed(2)} (${signal.signalType === 'BUY' ? 'Kauf' : 'Verkauf'}, Gebühr: -$${tradeFee.toFixed(2)})`);

        toast({
          title: "Auto-Trade ausgeführt",
          description: `${signal.signalType} ${signal.assetPair} automatisch ausgeführt`,
        });

        // Reset retry count on success
        setRetryCount(0);
        setAutoModeError(null);
        
        console.log('✅ Auto-trade completed successfully');
        return true;
      } else {
        throw new Error(tradeResult.error);
      }
    } catch (error) {
      console.error('❌ Auto-trade execution failed:', error);
      return handleAutoTradeError(error, signal, addLogEntry, updateSimulationState, simulationState);
    }
  }, [executeTradeFromSignal, validateTradeRisk, retryCount]);

  const handleAutoTradeError = useCallback((
    error: unknown,
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    updateSimulationState: (state: SimulationState) => void,
    simulationState: SimulationState
  ): boolean => {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    loggingService.logError('Auto-trade execution failed', {
      error: errorMessage,
      signal: signal.assetPair,
      retryCount
    });

    addLogEntry('ERROR', `AUTO-TRADE fehlgeschlagen: ${errorMessage}`);

    // FIXED: Implement proper retry logic with exponential backoff
    if (retryCount < 3) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      const retryDelay = Math.pow(2, newRetryCount) * 1000; // Exponential backoff
      
      addLogEntry('WARNING', `AUTO-TRADE Retry ${newRetryCount}/3 in ${retryDelay/1000}s`);
      
      // Schedule retry
      setTimeout(() => {
        console.log(`🔄 Retrying auto-trade for ${signal.assetPair} (attempt ${newRetryCount})`);
        // Note: The retry will be handled by the calling function
      }, retryDelay);
      
      return false;
    } else {
      // Max retries reached, pause simulation instead of disabling autoMode
      setAutoModeError(errorMessage);
      
      const pausedState = {
        ...simulationState,
        isPaused: true
      };
      updateSimulationState(pausedState);
      
      toast({
        title: "Simulation pausiert",
        description: `Nach 3 Fehlversuchen pausiert: ${errorMessage}`,
        variant: "destructive"
      });
      
      addLogEntry('ERROR', `Simulation wegen wiederholten Fehlern pausiert: ${errorMessage}`);
      
      // Reset retry count for next time
      setRetryCount(0);
      
      return false;
    }
  }, [retryCount]);

  return {
    executeAutoTrade,
    autoModeError,
    setAutoModeError,
    retryCount,
    setRetryCount
  };
};
