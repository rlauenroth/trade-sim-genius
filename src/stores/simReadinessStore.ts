import { SimReadinessState, SimReadinessStatus, SimReadinessAction, PortfolioSnapshot } from '@/types/simReadiness';
import { kucoinService } from '@/services/kucoinService';
import { retryScheduler } from '@/services/retryScheduler';
import { RateLimitError, ProxyError, ApiError } from '@/utils/errors';
import { SIM_CONFIG } from '@/services/cacheService';
import { loggingService } from '@/services/loggingService';
import { useCentralPortfolioStore } from './centralPortfolioStore';

class SimReadinessStore {
  private static instance: SimReadinessStore;
  private listeners: ((status: SimReadinessStatus) => void)[] = [];
  private status: SimReadinessStatus = {
    state: 'IDLE',
    reason: null,
    snapshotAge: 0,
    lastApiPing: 0,
    retryCount: 0,
    portfolio: null
  };
  
  private ttlTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private fetchInProgress: boolean = false;
  private fetchTimeout: NodeJS.Timeout | null = null;
  
  // Global fetch lock to prevent concurrent fetches
  private static globalFetchLock: boolean = false;
  private lastStateChange: number = 0;
  private redundantDispatchPrevention: Map<string, number> = new Map();

  static getInstance(): SimReadinessStore {
    if (!SimReadinessStore.instance) {
      SimReadinessStore.instance = new SimReadinessStore();
    }
    return SimReadinessStore.instance;
  }

  subscribe(listener: (status: SimReadinessStatus) => void) {
    this.listeners.push(listener);
    
    // Only auto-populate from central store once
    const centralStore = useCentralPortfolioStore.getState();
    if (centralStore.snapshot && this.status.state === 'IDLE') {
      console.log('🔄 SimReadiness: Found data in central store on subscribe, updating state to READY');
      this.dispatch({ type: 'FETCH_SUCCESS', payload: centralStore.snapshot });
    }
    
    // Immediately call with current status
    listener(this.getStatus());
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getStatus(): SimReadinessStatus {
    const now = Date.now();
    
    // Always try to get fresh data from central store but avoid loops
    const centralStore = useCentralPortfolioStore.getState();
    if (centralStore.snapshot && this.status.portfolio !== centralStore.snapshot) {
      this.status.portfolio = centralStore.snapshot;
      
      // Only auto-correct if significant time has passed since last state change
      if (this.status.state === 'FETCHING' && 
          centralStore.snapshot && 
          !centralStore.isLoading &&
          (now - this.lastStateChange) > 2000) { // 2 second debounce
        
        console.log('🔄 SimReadiness: Auto-correcting state from FETCHING to READY (debounced)');
        this.status.state = 'READY';
        this.status.reason = null;
        this.status.retryCount = 0;
        this.status.lastApiPing = now;
        this.lastStateChange = now;
        this.notifyListeners();
      }
    }
    
    const snapshotAge = this.status.portfolio ? now - this.status.portfolio.fetchedAt : 0;
    
    return {
      ...this.status,
      snapshotAge
    };
  }

  dispatch(action: SimReadinessAction): void {
    // Prevent redundant dispatches of the same action type
    const actionKey = action.type;
    const now = Date.now();
    const lastDispatch = this.redundantDispatchPrevention.get(actionKey) || 0;
    
    if (action.type === 'FETCH_SUCCESS' && (now - lastDispatch) < 1000) {
      console.log('🔄 Preventing redundant FETCH_SUCCESS dispatch (debounced)');
      return;
    }
    
    this.redundantDispatchPrevention.set(actionKey, now);
    
    console.log('🔄 SimReadiness dispatch:', action.type);
    loggingService.logEvent('SIM', `SimReadiness action: ${action.type}`, { action });
    
    const oldState = this.status.state;
    const newState = this.reducer(this.status, action);
    
    if (newState !== this.status) {
      console.log('🔄 State transition:', oldState, '->', newState.state);
      loggingService.logEvent('SIM', `State transition: ${oldState} -> ${newState.state}`, {
        oldState,
        newState: newState.state
      });
      
      this.status = newState;
      this.lastStateChange = now;
      this.notifyListeners();
      this.handleStateEffects(action);
    }
  }

  private reducer(state: SimReadinessStatus, action: SimReadinessAction): SimReadinessStatus {
    const now = Date.now();
    
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

  private async fetchPortfolioData(): Promise<void> {
    // Global fetch lock to prevent concurrent fetches from any source
    if (this.fetchInProgress || SimReadinessStore.globalFetchLock) {
      console.log('⚠️ Fetch already in progress globally, skipping...');
      return;
    }
    
    this.fetchInProgress = true;
    SimReadinessStore.globalFetchLock = true;
    console.log('🔄 Starting fetchPortfolioData...');
    
    try {
      useCentralPortfolioStore.getState().setLoading(true);
      
      const portfolio = await kucoinService.fetchPortfolio();
      
      console.log('✅ Portfolio data fetched:', {
        totalValue: portfolio.totalValue,
        positionCount: portfolio.positions.length
      });
      
      this.dispatch({ type: 'FETCH_SUCCESS', payload: portfolio });
      
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Portfolio fetch failed:', reason);
      this.dispatch({ type: 'FETCH_FAIL', payload: reason });
    } finally {
      this.fetchInProgress = false;
      SimReadinessStore.globalFetchLock = false;
    }
  }

  private handleStateEffects(action: SimReadinessAction): void {
    console.log('🎯 HandleStateEffects for state:', this.status.state);
    
    // Stop all timers first to prevent conflicts
    this.stopAllTimers();
    
    switch (this.status.state) {
      case 'FETCHING':
        this.fetchPortfolioData();
        break;
        
      case 'READY':
        this.startTTLTimer();
        // Only start refresh timer if not already running
        this.startPortfolioRefresh();
        break;
        
      case 'SIM_RUNNING':
        this.startHealthChecks();
        this.startPortfolioRefresh();
        this.startWatchdog();
        break;
        
      case 'UNSTABLE':
        this.scheduleRetry();
        break;
        
      case 'IDLE':
        // No timers needed for IDLE state
        break;
    }
  }

  private startTTLTimer(): void {
    if (this.ttlTimer) return; // Prevent duplicate timers
    console.log('⏰ Starting TTL timer');
    this.ttlTimer = setTimeout(() => {
      console.log('⏰ Portfolio snapshot TTL exceeded');
      this.dispatch({ type: 'AGE_EXCEEDED' });
    }, SIM_CONFIG.SNAPSHOT_TTL);
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) return;
    console.log('🏥 Starting health checks');
    this.healthCheckTimer = setInterval(async () => {
      try {
        await kucoinService.ping();
        console.log('✅ Health check passed');
      } catch (error) {
        console.error('❌ Health check failed:', error);
        this.dispatch({ type: 'API_DOWN', payload: 'API health check failed' });
      }
    }, 30 * 1000);
  }

  private startPortfolioRefresh(): void {
    if (this.refreshTimer) return; // Prevent duplicate timers
    console.log('🔄 Starting portfolio refresh timer');
    this.refreshTimer = setInterval(() => {
      if ((this.status.state === 'READY' || this.status.state === 'SIM_RUNNING') && 
          !this.fetchInProgress && !SimReadinessStore.globalFetchLock) {
        console.log('🔄 Scheduled portfolio refresh...');
        this.fetchPortfolioData();
      }
    }, SIM_CONFIG.PORTFOLIO_REFRESH_INTERVAL);
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) return;
    console.log('🐕 Starting watchdog timer');
    this.watchdogTimer = setInterval(() => {
      if (this.status.state === 'SIM_RUNNING' && 
          this.status.portfolio && 
          !this.fetchInProgress && 
          !SimReadinessStore.globalFetchLock) {
        const now = Date.now();
        const age = now - this.status.portfolio.fetchedAt;
        const dangerZone = SIM_CONFIG.SNAPSHOT_TTL - SIM_CONFIG.REFRESH_MARGIN;
        
        if (age >= dangerZone) {
          console.log('⚠️ Watchdog triggered early refresh');
          this.fetchPortfolioData();
        }
      }
    }, SIM_CONFIG.WATCHDOG_INTERVAL);
  }

  private scheduleRetry(): void {
    if (!retryScheduler.canRetry(this.status.retryCount)) {
      console.log('❌ Max retry attempts reached');
      return;
    }

    const delay = retryScheduler.getNextDelay(this.status.retryCount);
    
    retryScheduler.scheduleRetry('sim-readiness', async () => {
      try {
        const isApiUp = await kucoinService.ping();
        if (isApiUp) {
          this.dispatch({ type: 'API_UP' });
        }
      } catch (error) {
        console.error('Retry ping failed:', error);
        this.dispatch({ type: 'API_DOWN', payload: 'Retry failed' });
      }
    }, delay);
  }

  private stopTTLTimer(): void {
    if (this.ttlTimer) {
      clearTimeout(this.ttlTimer);
      this.ttlTimer = null;
    }
  }

  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private stopPortfolioRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private stopAllTimers(): void {
    this.stopTTLTimer();
    this.stopHealthChecks();
    this.stopPortfolioRefresh();
    this.stopWatchdog();
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  initialize(): void {
    this.dispatch({ type: 'INIT' });
  }

  startSimulation(): void {
    this.dispatch({ type: 'START_SIMULATION' });
  }

  stopSimulation(): void {
    this.dispatch({ type: 'STOP_SIMULATION' });
  }

  destroy(): void {
    this.stopAllTimers();
    retryScheduler.clearRetry('sim-readiness');
    this.listeners = [];
    SimReadinessStore.globalFetchLock = false;
  }

  forceRefresh(): void {
    console.log('🔄 Forcing portfolio refresh...');
    useCentralPortfolioStore.getState().clearData();
    kucoinService.invalidateCache();
    
    if (this.status.state === 'READY' || this.status.state === 'SIM_RUNNING') {
      this.fetchPortfolioData();
    }
  }

  getCacheStats(): Record<string, number> {
    return kucoinService.getCacheStats();
  }

  getDetailedStatus(): Record<string, any> {
    const status = this.getStatus();
    const centralStore = useCentralPortfolioStore.getState();
    
    return {
      ...status,
      centralStore: {
        hasSnapshot: !!centralStore.snapshot,
        isLoading: centralStore.isLoading,
        error: centralStore.error,
        isStale: centralStore.isStale()
      },
      fetchInProgress: this.fetchInProgress,
      globalFetchLock: SimReadinessStore.globalFetchLock
    };
  }
}

export const simReadinessStore = SimReadinessStore.getInstance();
