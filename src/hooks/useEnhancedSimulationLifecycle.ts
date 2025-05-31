
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
  enhancedStartAISignalGeneration: () => Promise<void>,
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

  // Enhanced simulation startup with state consolidation
  const startSimulation = useCallback(async (portfolioData: any) => {
    console.log('🚀 Enhanced simulation startup...');
    
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
      
      // Start enhanced timer
      startEnhancedTimer(
        true,
        updateResult.newState,
        enhancedStartAISignalGeneration,
        'Enhanced AI Signal Generation'
      );
      
      addLogEntry('SIM', 'Erweiterte Simulation erfolgreich gestartet');
      console.log('✅ Enhanced simulation started successfully');
      
    } catch (error) {
      console.error('❌ Enhanced simulation startup failed:', error);
      addLogEntry('ERROR', `Simulation-Start fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }, [initializeSimulation, validateStateConsistency, atomicUpdate, startEnhancedTimer, enhancedStartAISignalGeneration, addLogEntry]);

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

  // Enhanced pause/resume
  const pauseSimulation = useCallback(() => {
    stopEnhancedTimer();
    pauseSimulationState();
    addLogEntry('SIM', 'Erweiterte Simulation pausiert');
  }, [stopEnhancedTimer, pauseSimulationState, addLogEntry]);

  const resumeSimulation = useCallback(async () => {
    if (simulationState) {
      startEnhancedTimer(
        true,
        simulationState,
        enhancedStartAISignalGeneration,
        'Enhanced AI Signal Generation (Resumed)'
      );
    }
    resumeSimulationState();
    addLogEntry('SIM', 'Erweiterte Simulation fortgesetzt');
  }, [startEnhancedTimer, simulationState, enhancedStartAISignalGeneration, resumeSimulationState, addLogEntry]);

  return {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  };
};
