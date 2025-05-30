
import { useState, useCallback } from 'react';
import { SimulationState } from '@/types/simulation';

export const useSimulationState = () => {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  const validateSimulationState = useCallback((state: SimulationState, currentPortfolioValue: number): boolean => {
    // If simulation was never properly started or has invalid start value, consider it invalid
    if (!state.startPortfolioValue || state.startPortfolioValue <= 0) {
      return false;
    }
    
    // If the start value is dramatically different from current portfolio (like old mock data)
    // and simulation is not active, consider it stale
    if (!state.isActive && Math.abs(state.startPortfolioValue - currentPortfolioValue) > currentPortfolioValue * 10) {
      console.log('🗑️ Clearing stale simulation data with invalid start value:', state.startPortfolioValue, 'vs current:', currentPortfolioValue);
      return false;
    }
    
    return true;
  }, []);

  const loadSimulationState = useCallback((currentPortfolioValue?: number) => {
    try {
      const saved = localStorage.getItem('kiTradingApp_simulationState');
      if (saved) {
        const state = JSON.parse(saved);
        
        // Validate the loaded state if we have current portfolio value
        if (currentPortfolioValue && !validateSimulationState(state, currentPortfolioValue)) {
          console.log('🗑️ Removing invalid simulation state from localStorage');
          localStorage.removeItem('kiTradingApp_simulationState');
          setSimulationState(null);
          setIsSimulationActive(false);
          return;
        }
        
        setSimulationState(state);
        setIsSimulationActive(state.isActive && !state.isPaused);
      }
    } catch (error) {
      console.error('Error loading simulation state:', error);
      localStorage.removeItem('kiTradingApp_simulationState');
    }
  }, [validateSimulationState]);

  const saveSimulationState = useCallback((state: SimulationState) => {
    try {
      console.log('💾 Saving simulation state:', {
        isActive: state.isActive,
        isPaused: state.isPaused,
        portfolioValue: state.currentPortfolioValue,
        openPositions: state.openPositions.length,
        paperAssets: state.paperAssets.map(a => ({ symbol: a.symbol, quantity: a.quantity }))
      });
      
      localStorage.setItem('kiTradingApp_simulationState', JSON.stringify(state));
      setSimulationState(state);
      
      console.log('✅ Simulation state saved successfully');
    } catch (error) {
      console.error('❌ Error saving simulation state:', error);
    }
  }, []);

  const clearSimulationState = useCallback(() => {
    localStorage.removeItem('kiTradingApp_simulationState');
    setSimulationState(null);
    setIsSimulationActive(false);
  }, []);

  // Add missing methods
  const initializeSimulation = useCallback((portfolioData: any): SimulationState => {
    // Enhanced portfolio data extraction for initialization
    const portfolioValue = portfolioData.totalValue || portfolioData.totalUSDValue || 0;
    
    loggingService.logEvent('SIM', 'Initializing simulation state', {
      portfolioValue,
      portfolioDataStructure: {
        hasPositions: !!portfolioData.positions,
        positionsCount: portfolioData.positions?.length || 0,
        hasProperties: Object.keys(portfolioData || {}),
        positions: portfolioData.positions?.map((pos: any) => ({
          currency: pos.currency,
          balance: pos.balance,
          available: pos.available
        })) || []
      }
    });

    // Create paper assets from portfolio positions with proper fallbacks
    const paperAssets = [];
    
    if (portfolioData.positions && Array.isArray(portfolioData.positions)) {
      portfolioData.positions.forEach((pos: any) => {
        const balance = parseFloat(pos.balance || pos.available || pos.quantity || 0);
        if (balance > 0) {
          paperAssets.push({
            symbol: pos.currency || pos.symbol,
            quantity: balance,
            entryPrice: pos.currency === 'USDT' || pos.symbol === 'USDT' ? 1 : undefined
          });
        }
      });
    }

    // Ensure USDT exists in paper assets (fallback)
    const hasUSDT = paperAssets.some(asset => asset.symbol === 'USDT');
    if (!hasUSDT && portfolioValue > 0) {
      paperAssets.push({
        symbol: 'USDT',
        quantity: portfolioValue,
        entryPrice: 1
      });
      
      loggingService.logEvent('SIM', 'Added USDT fallback to paper assets', {
        usdtQuantity: portfolioValue
      });
    }

    const initialState: SimulationState = {
      isActive: true,
      isPaused: false,
      startTime: Date.now(),
      startPortfolioValue: portfolioValue,
      currentPortfolioValue: portfolioValue,
      realizedPnL: 0,
      openPositions: [],
      paperAssets
    };
    
    loggingService.logSuccess('Simulation state initialized successfully', {
      startPortfolioValue: initialState.startPortfolioValue,
      paperAssetsCount: initialState.paperAssets.length,
      paperAssets: initialState.paperAssets.map(asset => ({
        symbol: asset.symbol,
        quantity: asset.quantity
      }))
    });
    
    saveSimulationState(initialState);
    setIsSimulationActive(true);
    return initialState;
  }, [saveSimulationState]);

  const updateSimulationState = useCallback((newState: SimulationState) => {
    console.log('🔄 Updating simulation state:', {
      from: simulationState?.currentPortfolioValue,
      to: newState.currentPortfolioValue,
      openPositions: newState.openPositions.length
    });
    saveSimulationState(newState);
  }, [saveSimulationState, simulationState]);

  const pauseSimulation = useCallback(() => {
    if (simulationState) {
      const updatedState = { ...simulationState, isPaused: true };
      saveSimulationState(updatedState);
      setIsSimulationActive(false);
    }
  }, [simulationState, saveSimulationState]);

  const resumeSimulation = useCallback(() => {
    if (simulationState) {
      const updatedState = { ...simulationState, isPaused: false };
      saveSimulationState(updatedState);
      setIsSimulationActive(true);
    }
  }, [simulationState, saveSimulationState]);

  const stopSimulation = useCallback(() => {
    if (simulationState) {
      const updatedState = { ...simulationState, isActive: false, isPaused: false };
      saveSimulationState(updatedState);
      setIsSimulationActive(false);
    }
  }, [simulationState, saveSimulationState]);

  return {
    simulationState,
    isSimulationActive,
    setIsSimulationActive,
    loadSimulationState,
    saveSimulationState,
    clearSimulationState,
    initializeSimulation,
    updateSimulationState,
    pauseSimulation,
    resumeSimulation,
    stopSimulation
  };
};
