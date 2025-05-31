
import { useCallback } from 'react';
import { SimulationState } from '@/types/simulation';
import { usePortfolioStateConsolidator } from './usePortfolioStateConsolidator';
import { useEnhancedSimulationTimers } from './useEnhancedSimulationTimers';
import { useActivityLog } from './useActivityLog';
import { loggingService } from '@/services/loggingService';

export const useEnhancedSimulationLifecycle = (
  simulationState: SimulationState | null,
  initializeSimulation: (portfolioData: any) => SimulationState,
  updateSimulationState: (state: SimulationState) => void,
  pauseSimulationState: () => void,
  resumeSimulationState: () => void,
  stopSimulationState: () => void,
  startAISignalGenerationWithCandidates: (isActive: boolean, addLogEntry: any, executeAutoTrade?: any, updateSimulationState?: any) => Promise<void>,
  forceClear: () => void,
  setAICurrentSignal: (signal: any) => void,
  setAvailableSignals: (signals: any[]) => void
) => {
  const {
    atomicUpdate,
    validateStateConsistency,
    getConsistencyReport
  } = usePortfolioStateConsolidator();

  const {
    startEnhancedTimer,
    stopEnhancedTimer
  } = useEnhancedSimulationTimers();

  const { addLogEntry } = useActivityLog();

  // Enhanced simulation startup with candidate-aware signal generation
  const startSimulation = useCallback(async (portfolioData: any) => {
    console.log('🚀 Enhanced simulation startup with candidate integration...');
    
    try {
      // Initialize with validation
      const initialState = initializeSimulation(portfolioData);
      
      if (!validateStateConsistency(initialState)) {
        throw new Error('Initial simulation state failed validation');
      }
      
      // Use atomic update for state persistence
      const updateResult = atomicUpdate(
        initialState,
        (state) => ({ ...state, isActive: true, isPaused: false }),
        'Simulation startup'
      );
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'State update failed');
      }
      
      // Create candidate-aware signal generation function
      const enhancedStartAISignalGenerationWithCandidates = async () => {
        console.log('🚀 EnhancedLifecycle: Starting AI signal generation with candidates');
        await startAISignalGenerationWithCandidates(
          true,
          addLogEntry,
          undefined, // executeAutoTrade will be handled internally
          updateSimulationState
        );
      };
      
      // Start enhanced timer with candidate integration
      startEnhancedTimer(
        true,
        updateResult.newState,
        enhancedStartAISignalGenerationWithCandidates,
        'Enhanced AI Signal Generation with Candidates'
      );
      
      // Immediately start the first signal generation cycle with candidates
      console.log('🚀 EnhancedLifecycle: Starting immediate signal generation with candidates');
      await enhancedStartAISignalGenerationWithCandidates();
      
      addLogEntry('SIM', 'Erweiterte Simulation mit Kandidaten-Verfolgung gestartet');
      console.log('✅ Enhanced simulation with candidate tracking started successfully');
      
    } catch (error) {
      console.error('❌ Enhanced simulation startup failed:', error);
      addLogEntry('ERROR', `Simulation-Start fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }, [initializeSimulation, validateStateConsistency, atomicUpdate, startEnhancedTimer, startAISignalGenerationWithCandidates, addLogEntry, updateSimulationState]);

  // Enhanced stop simulation
  const stopSimulation = useCallback(() => {
    console.log('🛑 Enhanced simulation stop...');
    
    stopEnhancedTimer();
    forceClear(); // Clear signal state machine
    setAICurrentSignal(null);
    setAvailableSignals([]);
    stopSimulationState();
    
    addLogEntry('SIM', 'Erweiterte Simulation beendet');
    
    // Log final state consistency report
    const report = getConsistencyReport();
    loggingService.logEvent('SIM', 'Simulation stopped with consistency report', report);
  }, [stopEnhancedTimer, forceClear, setAICurrentSignal, setAvailableSignals, stopSimulationState, addLogEntry, getConsistencyReport]);

  // Enhanced pause/resume with candidate integration
  const pauseSimulation = useCallback(() => {
    stopEnhancedTimer();
    pauseSimulationState();
    addLogEntry('SIM', 'Erweiterte Simulation pausiert');
  }, [stopEnhancedTimer, pauseSimulationState, addLogEntry]);

  const resumeSimulation = useCallback(async () => {
    if (simulationState) {
      // Create candidate-aware signal generation function for resume
      const enhancedStartAISignalGenerationWithCandidates = async () => {
        console.log('🚀 EnhancedLifecycle RESUME: Starting AI signal generation with candidates');
        await startAISignalGenerationWithCandidates(
          true,
          addLogEntry,
          undefined, // executeAutoTrade will be handled internally
          updateSimulationState
        );
      };
      
      startEnhancedTimer(
        true,
        simulationState,
        enhancedStartAISignalGenerationWithCandidates,
        'Enhanced AI Signal Generation with Candidates (Resumed)'
      );
    }
    resumeSimulationState();
    addLogEntry('SIM', 'Erweiterte Simulation fortgesetzt');
  }, [startEnhancedTimer, simulationState, startAISignalGenerationWithCandidates, resumeSimulationState, addLogEntry, updateSimulationState]);

  return {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  };
};
