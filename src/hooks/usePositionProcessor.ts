
import { useCallback } from 'react';
import { Position, SimulationState } from '@/types/simulation';
import { ExitScreeningService } from '@/services/exitScreeningService';
import { loggingService } from '@/services/loggingService';
import { ApiKeys } from '@/types/appState';

export const usePositionProcessor = () => {
  const exitScreeningService = new ExitScreeningService();

  const processExitScreening = useCallback(async (
    simulationState: SimulationState,
    strategy: string,
    apiKeys: ApiKeys,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    if (!simulationState.openPositions.length) {
      return;
    }

    loggingService.logEvent('AI', 'Starting exit screening cycle', {
      openPositions: simulationState.openPositions.length,
      positions: simulationState.openPositions.map(p => ({
        id: p.id,
        assetPair: p.assetPair,
        type: p.type
      }))
    });

    addLogEntry('EXIT_SCREENING', `Exit-Screening gestartet für ${simulationState.openPositions.length} offene Positionen`);

    let positionsToClose: Position[] = [];

    for (const position of simulationState.openPositions) {
      try {
        const decision = await exitScreeningService.analyzePositionForExit(position, strategy, apiKeys);
        
        if (decision === 'SELL') {
          positionsToClose.push(position);
          addLogEntry('EXIT_SCREENING', `Position markiert zum Schließen: ${position.assetPair} (${position.type})`);
        } else {
          addLogEntry('EXIT_SCREENING', `Position behalten: ${position.assetPair} (${position.type})`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        loggingService.logError('Position exit analysis failed', {
          positionId: position.id,
          error: error instanceof Error ? error.message : 'unknown'
        });
        addLogEntry('ERROR', `Exit-Analyse fehlgeschlagen für ${position.assetPair}`);
      }
    }

    if (positionsToClose.length > 0) {
      const updatedPositions = simulationState.openPositions.filter(
        position => !positionsToClose.some(toClose => toClose.id === position.id)
      );

      let totalRealizedPnL = 0;
      let updatedAssets = [...simulationState.paperAssets];

      for (const position of positionsToClose) {
        const tradingFee = (position.quantity * position.entryPrice) * 0.001;
        const netPnL = position.unrealizedPnL - tradingFee;
        totalRealizedPnL += netPnL;

        const usdtValue = position.quantity * position.entryPrice + netPnL;
        const usdtAssetIndex = updatedAssets.findIndex(asset => asset.symbol === 'USDT');
        
        if (usdtAssetIndex >= 0) {
          updatedAssets[usdtAssetIndex].quantity += usdtValue;
        } else {
          updatedAssets.push({ symbol: 'USDT', quantity: usdtValue });
        }

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
  }, [exitScreeningService]);

  return {
    processExitScreening
  };
};
