
import { useCallback, useRef } from 'react';
import { Position, SimulationState, Signal } from '@/types/simulation';
import { AISignalService } from '@/services/aiSignal';
import { loggingService } from '@/services/loggingService';
import { useAppState } from './useAppState';

export const useExitScreening = () => {
  const { userSettings } = useAppState();
  const exitScreeningTimer = useRef<NodeJS.Timeout | null>(null);

  const analyzePositionForExit = useCallback(async (
    position: Position,
    openRouterApiKey: string
  ): Promise<'SELL' | 'HOLD'> => {
    try {
      loggingService.logEvent('EXIT_SCREENING', 'Analyzing position for exit', {
        positionId: position.id,
        assetPair: position.assetPair,
        entryPrice: position.entryPrice,
        currentPnL: position.unrealizedPnL
      });

      const aiService = new AISignalService({
        strategy: userSettings.tradingStrategy || 'balanced',
        simulatedPortfolioValue: 1000, // Not relevant for exit analysis
        availableUSDT: 0, // Not relevant for exit analysis
        openRouterApiKey,
        modelName: userSettings.aiModel || 'claude-3-haiku'
      });

      const signal = await aiService.generateDetailedSignal(position.assetPair);
      
      if (!signal) {
        loggingService.logEvent('EXIT_SCREENING', 'No signal generated, holding position', {
          positionId: position.id,
          assetPair: position.assetPair
        });
        return 'HOLD';
      }

      // For exit screening, we look for opposite signals or HOLD
      const shouldExit = (
        (position.type === 'BUY' && signal.signalType === 'SELL') ||
        (position.type === 'SELL' && signal.signalType === 'BUY')
      );

      const decision = shouldExit ? 'SELL' : 'HOLD';

      loggingService.logEvent('EXIT_SCREENING', 'Exit analysis completed', {
        positionId: position.id,
        assetPair: position.assetPair,
        positionType: position.type,
        signalType: signal.signalType,
        decision,
        confidence: signal.confidenceScore
      });

      return decision;
    } catch (error) {
      loggingService.logError('Exit screening analysis failed', {
        positionId: position.id,
        assetPair: position.assetPair,
        error: error instanceof Error ? error.message : 'unknown'
      });
      return 'HOLD'; // Default to hold on error
    }
  }, [userSettings]);

  const processExitScreening = useCallback(async (
    simulationState: SimulationState,
    openRouterApiKey: string,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    if (!simulationState.openPositions.length) {
      return;
    }

    loggingService.logEvent('EXIT_SCREENING', 'Starting exit screening cycle', {
      openPositions: simulationState.openPositions.length,
      positions: simulationState.openPositions.map(p => ({
        id: p.id,
        assetPair: p.assetPair,
        type: p.type
      }))
    });

    addLogEntry('EXIT_SCREENING', `Exit-Screening gestartet für ${simulationState.openPositions.length} offene Positionen`);

    let positionsToClose: Position[] = [];

    // Analyze each position
    for (const position of simulationState.openPositions) {
      try {
        const decision = await analyzePositionForExit(position, openRouterApiKey);
        
        if (decision === 'SELL') {
          positionsToClose.push(position);
          addLogEntry('EXIT_SCREENING', `Position markiert zum Schließen: ${position.assetPair} (${position.type})`);
        } else {
          addLogEntry('EXIT_SCREENING', `Position behalten: ${position.assetPair} (${position.type})`);
        }

        // Add delay between analyses to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        loggingService.logError('Position exit analysis failed', {
          positionId: position.id,
          error: error instanceof Error ? error.message : 'unknown'
        });
        addLogEntry('ERROR', `Exit-Analyse fehlgeschlagen für ${position.assetPair}`);
      }
    }

    // Close positions that should be exited
    if (positionsToClose.length > 0) {
      const updatedPositions = simulationState.openPositions.filter(
        position => !positionsToClose.some(toClose => toClose.id === position.id)
      );

      // Calculate realized P&L and update portfolio value
      let totalRealizedPnL = 0;
      let updatedAssets = [...simulationState.paperAssets];

      for (const position of positionsToClose) {
        const tradingFee = (position.quantity * position.entryPrice) * 0.001; // 0.1% fee
        const netPnL = position.unrealizedPnL - tradingFee;
        totalRealizedPnL += netPnL;

        // Convert back to USDT
        const usdtValue = position.quantity * position.entryPrice + netPnL;
        const usdtAssetIndex = updatedAssets.findIndex(asset => asset.symbol === 'USDT');
        
        if (usdtAssetIndex >= 0) {
          updatedAssets[usdtAssetIndex].quantity += usdtValue;
        } else {
          updatedAssets.push({ symbol: 'USDT', quantity: usdtValue });
        }

        // Remove the traded asset
        const assetSymbol = position.assetPair.split('/')[0] || position.assetPair.split('-')[0];
        const assetIndex = updatedAssets.findIndex(asset => asset.symbol === assetSymbol);
        if (assetIndex >= 0) {
          updatedAssets[assetIndex].quantity -= position.quantity;
          if (updatedAssets[assetIndex].quantity <= 0) {
            updatedAssets.splice(assetIndex, 1);
          }
        }

        loggingService.logEvent('TRADE', 'Position closed by exit screening', {
          positionId: position.id,
          assetPair: position.assetPair,
          realizedPnL: netPnL,
          fee: tradingFee
        });

        addLogEntry('SUCCESS', `Position geschlossen: ${position.assetPair}, P&L: $${netPnL.toFixed(2)}`);
      }

      const updatedState = {
        ...simulationState,
        openPositions: updatedPositions,
        paperAssets: updatedAssets,
        realizedPnL: simulationState.realizedPnL + totalRealizedPnL,
        currentPortfolioValue: simulationState.currentPortfolioValue + totalRealizedPnL
      };

      updateSimulationState(updatedState);
      
      loggingService.logSuccess('Exit screening completed', {
        positionsAnalyzed: simulationState.openPositions.length,
        positionsClosed: positionsToClose.length,
        totalRealizedPnL,
        newPortfolioValue: updatedState.currentPortfolioValue
      });

      addLogEntry('EXIT_SCREENING', `Exit-Screening abgeschlossen: ${positionsToClose.length} Positionen geschlossen, P&L: $${totalRealizedPnL.toFixed(2)}`);
    } else {
      addLogEntry('EXIT_SCREENING', 'Exit-Screening abgeschlossen: Alle Positionen werden gehalten');
    }
  }, [analyzePositionForExit]);

  const startExitScreening = useCallback((
    simulationState: SimulationState,
    openRouterApiKey: string,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    stopExitScreening();

    loggingService.logEvent('EXIT_SCREENING', 'Starting exit screening timer', {
      interval: '5 minutes',
      openPositions: simulationState.openPositions.length
    });

    exitScreeningTimer.current = setInterval(async () => {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState?.isActive && !currentState?.isPaused && currentState.openPositions?.length > 0) {
        await processExitScreening(currentState, openRouterApiKey, updateSimulationState, addLogEntry);
      }
    }, 5 * 60 * 1000); // 5 minutes

    addLogEntry('EXIT_SCREENING', 'Exit-Screening Timer gestartet (5 Minuten Intervall)');
  }, [processExitScreening]);

  const stopExitScreening = useCallback(() => {
    if (exitScreeningTimer.current) {
      clearInterval(exitScreeningTimer.current);
      exitScreeningTimer.current = null;
      loggingService.logEvent('EXIT_SCREENING', 'Exit screening timer stopped');
    }
  }, []);

  return {
    startExitScreening,
    stopExitScreening,
    processExitScreening
  };
};
