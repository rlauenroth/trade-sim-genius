
import { useCallback, useEffect, useRef } from 'react';
import { SimulationState } from '@/types/simulation';
import { portfolioEvaluationService } from '@/services/portfolioEvaluationService';
import { loggingService } from '@/services/loggingService';

export const usePortfolioEvaluation = (
  simulationState: SimulationState | null,
  isSimulationActive: boolean,
  updateSimulationState: (state: SimulationState) => void
) => {
  const evaluationInterval = useRef<NodeJS.Timeout | null>(null);
  const lastEvaluationTime = useRef<number>(0);
  
  const evaluateAndUpdatePortfolio = useCallback(async () => {
    if (!simulationState || !isSimulationActive || simulationState.openPositions.length === 0) {
      return;
    }

    const now = Date.now();
    // Skip if evaluated recently (within 30 seconds)
    if (now - lastEvaluationTime.current < 30000) {
      return;
    }

    try {
      const evaluation = await portfolioEvaluationService.evaluatePortfolio(simulationState);
      
      // Update unrealized PnL for positions
      const updatedPositions = simulationState.openPositions.map(position => {
        const positionEval = evaluation.positions.find(p => p.positionId === position.id);
        return positionEval 
          ? { ...position, unrealizedPnL: positionEval.unrealizedPnL }
          : position;
      });

      // Update simulation state with new portfolio value and position PnL
      const updatedState: SimulationState = {
        ...simulationState,
        currentPortfolioValue: evaluation.totalValue,
        openPositions: updatedPositions
      };

      updateSimulationState(updatedState);
      lastEvaluationTime.current = now;

      loggingService.logEvent('PORTFOLIO_UPDATE', 'Continuous portfolio evaluation updated', {
        totalValue: evaluation.totalValue,
        unrealizedPnL: evaluation.unrealizedPnL,
        positionsCount: evaluation.positions.length,
        evaluationTime: now
      });

    } catch (error) {
      loggingService.logError('Continuous portfolio evaluation failed', {
        error: error instanceof Error ? error.message : 'unknown',
        positionsCount: simulationState.openPositions.length
      });
    }
  }, [simulationState, isSimulationActive, updateSimulationState]);

  // Start/stop evaluation interval based on simulation state
  useEffect(() => {
    if (isSimulationActive && simulationState?.openPositions.length > 0) {
      // Start evaluation interval (every 60 seconds)
      evaluationInterval.current = setInterval(evaluateAndUpdatePortfolio, 60000);
      
      // Run initial evaluation
      evaluateAndUpdatePortfolio();
      
      loggingService.logEvent('PORTFOLIO_UPDATE', 'Continuous portfolio evaluation started');
    } else {
      // Stop evaluation interval
      if (evaluationInterval.current) {
        clearInterval(evaluationInterval.current);
        evaluationInterval.current = null;
        loggingService.logEvent('PORTFOLIO_UPDATE', 'Continuous portfolio evaluation stopped');
      }
    }

    return () => {
      if (evaluationInterval.current) {
        clearInterval(evaluationInterval.current);
      }
    };
  }, [isSimulationActive, simulationState?.openPositions.length, evaluateAndUpdatePortfolio]);

  // Manual evaluation trigger
  const triggerEvaluation = useCallback(async () => {
    await evaluateAndUpdatePortfolio();
  }, [evaluateAndUpdatePortfolio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      portfolioEvaluationService.clearCache();
    };
  }, []);

  return {
    triggerEvaluation
  };
};
