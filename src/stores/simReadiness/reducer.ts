
import { SimReadinessState, SimReadinessStatus, SimReadinessAction } from '@/types/simReadiness';
import { useCentralPortfolioStore } from '@/stores/centralPortfolioStore';
import { SIM_CONFIG } from '@/services/cacheService';
import { loggingService } from '@/services/loggingService';

export function simReadinessReducer(state: SimReadinessStatus, action: SimReadinessAction): SimReadinessStatus {
  const now = Date.now();
  
  console.log('🔄 SimReadiness reducer:', action.type);
  loggingService.logEvent('SIM', `SimReadiness action: ${action.type}`, { action });
  
  switch (action.type) {
    case 'INIT':
      // Check if central store already has data
      const centralStore = useCentralPortfolioStore.getState();
      if (centralStore.snapshot && !centralStore.isLoading) {
        console.log('✅ Reducer: INIT - found existing data in central store, going to READY');
        return {
          ...state,
          state: 'READY',
          reason: null,
          portfolio: centralStore.snapshot,
          lastApiPing: now,
          retryCount: 0
        };
      }
      
      console.log('🚀 Reducer: INIT - starting fresh fetch');
      return {
        ...state,
        state: 'FETCHING',
        reason: 'Initializing...',
        retryCount: 0
      };

    case 'FETCH_SUCCESS':
      // Prevent state change if we're already READY with the same data
      if (state.state === 'READY' && 
          state.portfolio && 
          state.portfolio.fetchedAt === action.payload.fetchedAt) {
        console.log('🔄 Skipping redundant FETCH_SUCCESS - already READY with same data');
        return state;
      }
      
      console.log('✅ Reducer: FETCH_SUCCESS - transitioning to READY');
      
      // Update central store only if not already updated
      const currentCentralData = useCentralPortfolioStore.getState().snapshot;
      if (!currentCentralData || currentCentralData.fetchedAt !== action.payload.fetchedAt) {
        useCentralPortfolioStore.getState().setSnapshot(action.payload);
      }
      
      return {
        ...state,
        state: 'READY',
        reason: null,
        portfolio: action.payload,
        lastApiPing: now,
        retryCount: 0
      };

    case 'FETCH_FAIL':
    case 'API_DOWN':
      useCentralPortfolioStore.getState().setError(action.payload);
      return {
        ...state,
        state: 'UNSTABLE',
        reason: action.payload,
        retryCount: state.retryCount + 1
      };

    case 'AGE_EXCEEDED':
      return {
        ...state,
        state: 'UNSTABLE',
        reason: `Portfolio data expired (>${SIM_CONFIG.SNAPSHOT_TTL / 1000}s old)`
      };

    case 'API_UP':
      return {
        ...state,
        state: 'FETCHING',
        reason: 'Reconnecting...',
        lastApiPing: now
      };

    case 'START_SIMULATION':
      return {
        ...state,
        state: 'SIM_RUNNING'
      };

    case 'STOP_SIMULATION':
      return {
        ...state,
        state: state.portfolio && (now - state.portfolio.fetchedAt) < SIM_CONFIG.SNAPSHOT_TTL ? 'READY' : 'UNSTABLE'
      };

    default:
      return state;
  }
}
