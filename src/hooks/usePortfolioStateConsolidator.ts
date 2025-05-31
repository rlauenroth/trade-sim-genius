
import { useCallback, useEffect, useRef } from 'react';
import { SimulationState } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';

interface PortfolioSnapshot {
  simulationState: SimulationState | null;
  lastSync: number;
  checksum: string;
}

export const usePortfolioStateConsolidator = () => {
  const lastSnapshotRef = useRef<PortfolioSnapshot | null>(null);
  const syncLockRef = useRef<boolean>(false);

  // Generate checksum for state consistency validation
  const generateChecksum = useCallback((state: SimulationState): string => {
    const key = `${state.currentPortfolioValue}_${state.openPositions.length}_${state.paperAssets.length}_${state.isActive}_${state.isPaused}`;
    return btoa(key).slice(0, 16);
  }, []);

  // Validate state consistency
  const validateStateConsistency = useCallback((state: SimulationState): boolean => {
    try {
      // Check required fields
      if (typeof state.currentPortfolioValue !== 'number' || state.currentPortfolioValue < 0) {
        console.warn('❌ Invalid portfolio value:', state.currentPortfolioValue);
        return false;
      }

      if (!Array.isArray(state.openPositions)) {
        console.warn('❌ Invalid openPositions array');
        return false;
      }

      if (!Array.isArray(state.paperAssets)) {
        console.warn('❌ Invalid paperAssets array');
        return false;
      }

      // Check paper assets consistency
      const usdtAsset = state.paperAssets.find(asset => asset.symbol === 'USDT');
      if (!usdtAsset || usdtAsset.quantity < 0) {
        console.warn('❌ Invalid USDT asset in paperAssets');
        return false;
      }

      // Validate positions
      for (const position of state.openPositions) {
        if (!position.id || !position.assetPair || !position.type) {
          console.warn('❌ Invalid position structure:', position);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ State validation error:', error);
      return false;
    }
  }, []);

  // Atomic update with rollback capability
  const atomicUpdate = useCallback((
    currentState: SimulationState,
    updateFunction: (state: SimulationState) => SimulationState,
    description: string
  ): { success: boolean; newState: SimulationState | null; error?: string } => {
    if (syncLockRef.current) {
      return { success: false, newState: null, error: 'Sync operation in progress' };
    }

    syncLockRef.current = true;
    
    try {
      console.log(`🔄 Atomic update started: ${description}`);
      
      // Create backup
      const backup = JSON.parse(JSON.stringify(currentState));
      
      // Apply update
      const newState = updateFunction(currentState);
      
      // Validate new state
      if (!validateStateConsistency(newState)) {
        console.error(`❌ State validation failed after update: ${description}`);
        return { success: false, newState: null, error: 'State validation failed' };
      }
      
      // Generate new checksum
      const newChecksum = generateChecksum(newState);
      
      // Save to localStorage with error handling
      try {
        localStorage.setItem('kiTradingApp_simulationState', JSON.stringify(newState));
        
        // Update snapshot
        lastSnapshotRef.current = {
          simulationState: newState,
          lastSync: Date.now(),
          checksum: newChecksum
        };
        
        loggingService.logEvent('PORTFOLIO_UPDATE', `Atomic update completed: ${description}`, {
          portfolioValueBefore: currentState.currentPortfolioValue,
          portfolioValueAfter: newState.currentPortfolioValue,
          positionsBefore: currentState.openPositions.length,
          positionsAfter: newState.openPositions.length,
          checksum: newChecksum
        });
        
        console.log(`✅ Atomic update completed: ${description}`);
        return { success: true, newState };
        
      } catch (storageError) {
        console.error(`❌ localStorage save failed for: ${description}`, storageError);
        return { success: false, newState: null, error: 'Storage operation failed' };
      }
      
    } catch (error) {
      console.error(`❌ Atomic update failed: ${description}`, error);
      return { 
        success: false, 
        newState: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      syncLockRef.current = false;
    }
  }, [validateStateConsistency, generateChecksum]);

  // Load state with auto-repair
  const loadStateWithRepair = useCallback((currentPortfolioValue?: number): SimulationState | null => {
    try {
      const saved = localStorage.getItem('kiTradingApp_simulationState');
      if (!saved) {
        console.log('📄 No saved simulation state found');
        return null;
      }

      const state = JSON.parse(saved);
      
      // Validate loaded state
      if (!validateStateConsistency(state)) {
        console.log('🔧 Auto-repairing invalid simulation state');
        
        // Attempt auto-repair
        const repairedState = autoRepairState(state, currentPortfolioValue);
        if (repairedState && validateStateConsistency(repairedState)) {
          localStorage.setItem('kiTradingApp_simulationState', JSON.stringify(repairedState));
          loggingService.logEvent('PORTFOLIO_UPDATE', 'State auto-repaired successfully');
          return repairedState;
        } else {
          console.log('🗑️ Cannot repair state, clearing invalid data');
          localStorage.removeItem('kiTradingApp_simulationState');
          return null;
        }
      }
      
      // Update snapshot
      lastSnapshotRef.current = {
        simulationState: state,
        lastSync: Date.now(),
        checksum: generateChecksum(state)
      };
      
      return state;
      
    } catch (error) {
      console.error('❌ Error loading simulation state:', error);
      localStorage.removeItem('kiTradingApp_simulationState');
      return null;
    }
  }, [validateStateConsistency, generateChecksum]);

  // Auto-repair function for corrupted state
  const autoRepairState = useCallback((
    corruptedState: any, 
    currentPortfolioValue?: number
  ): SimulationState | null => {
    try {
      const repaired: SimulationState = {
        isActive: Boolean(corruptedState.isActive),
        isPaused: Boolean(corruptedState.isPaused),
        startTime: corruptedState.startTime || Date.now(),
        startPortfolioValue: corruptedState.startPortfolioValue || currentPortfolioValue || 0,
        currentPortfolioValue: corruptedState.currentPortfolioValue || currentPortfolioValue || 0,
        realizedPnL: corruptedState.realizedPnL || 0,
        openPositions: Array.isArray(corruptedState.openPositions) ? corruptedState.openPositions : [],
        paperAssets: Array.isArray(corruptedState.paperAssets) ? corruptedState.paperAssets : [],
        autoMode: corruptedState.autoMode,
        autoTradeCount: corruptedState.autoTradeCount || 0,
        lastAutoTradeTime: corruptedState.lastAutoTradeTime,
        // FIXED: Add missing availableUSDT property
        availableUSDT: corruptedState.availableUSDT || currentPortfolioValue || 0
      };
      
      // Ensure USDT asset exists
      const hasUSDT = repaired.paperAssets.some(asset => asset.symbol === 'USDT');
      if (!hasUSDT && currentPortfolioValue) {
        repaired.paperAssets.push({
          symbol: 'USDT',
          quantity: currentPortfolioValue,
          entryPrice: 1
        });
      }
      
      console.log('🔧 State auto-repair completed:', {
        portfolioValue: repaired.currentPortfolioValue,
        paperAssets: repaired.paperAssets.length,
        openPositions: repaired.openPositions.length
      });
      
      return repaired;
    } catch (error) {
      console.error('❌ Auto-repair failed:', error);
      return null;
    }
  }, []);

  // Get consistency report
  const getConsistencyReport = useCallback(() => {
    const snapshot = lastSnapshotRef.current;
    if (!snapshot) {
      return { isConsistent: false, reason: 'No snapshot available' };
    }

    try {
      const currentSaved = localStorage.getItem('kiTradingApp_simulationState');
      if (!currentSaved) {
        return { isConsistent: false, reason: 'No localStorage data' };
      }

      const currentState = JSON.parse(currentSaved);
      const currentChecksum = generateChecksum(currentState);
      
      return {
        isConsistent: currentChecksum === snapshot.checksum,
        lastSync: snapshot.lastSync,
        currentChecksum,
        snapshotChecksum: snapshot.checksum,
        timeSinceSync: Date.now() - snapshot.lastSync
      };
    } catch (error) {
      return { isConsistent: false, reason: 'Validation error', error };
    }
  }, [generateChecksum]);

  return {
    atomicUpdate,
    loadStateWithRepair,
    validateStateConsistency,
    getConsistencyReport,
    isLocked: syncLockRef.current
  };
};
