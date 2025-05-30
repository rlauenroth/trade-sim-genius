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

  static getInstance(): SimReadinessStore {
    if (!SimReadinessStore.instance) {
      SimReadinessStore.instance = new SimReadinessStore();
    }
    return SimReadinessStore.instance;
  }

  subscribe(listener: (status: SimReadinessStatus) => void) {
    this.listeners.push(listener);
    
    // Check if we can get data from central store on subscribe
    const centralStore = useCentralPortfolioStore.getState();
    if (centralStore.snapshot && this.status.state !== 'READY') {
      console.log('🔄 SimReadiness: Found data in central store, updating state');
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
    
    // Always try to get fresh data from central store
    const centralStore = useCentralPortfolioStore.getState();
    if (centralStore.snapshot) {
      this.status.portfolio = centralStore.snapshot;
    }
    
    const snapshotAge = this.status.portfolio ? now - this.status.portfolio.fetchedAt : 0;
    
    return {
      ...this.status,
      snapshotAge
    };
  }

  dispatch(action: SimReadinessAction): void {
    console.log('🔄 SimReadiness action:', action.type, action);
    loggingService.logEvent('SIM', `SimReadiness action: ${action.type}`, { action });
    
    const newState = this.reducer(this.status, action);
    if (newState !== this.status) {
      console.log('🔄 State transition:', this.status.state, '->', newState.state);
      loggingService.logEvent('SIM', `State transition: ${this.status.state} -> ${newState.state}`, {
        oldState: this.status.state,
        newState: newState.state,
        reason: newState.reason
      });
      
      this.status = newState;
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
          console.log('✅ Reducer: INIT - found existing data in central store');
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
        console.log('✅ Reducer: FETCH_SUCCESS - updating both stores');
        
        // Update central store
        useCentralPortfolioStore.getState().setSnapshot(action.payload);
        
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
        console.log('❌ Reducer: FETCH_FAIL/API_DOWN with reason:', action.payload);
        
        // Update central store error
        useCentralPortfolioStore.getState().setError(action.payload);
        
        return {
          ...state,
          state: 'UNSTABLE',
          reason: action.payload,
          retryCount: state.retryCount + 1
        };

      case 'AGE_EXCEEDED':
        console.log('⏰ Reducer: AGE_EXCEEDED');
        return {
          ...state,
          state: 'UNSTABLE',
          reason: `Portfolio data expired (>${SIM_CONFIG.SNAPSHOT_TTL / 1000}s old)`
        };

      case 'API_UP':
        console.log('🔄 Reducer: API_UP - attempting reconnection');
        return {
          ...state,
          state: 'FETCHING',
          reason: 'Reconnecting...',
          lastApiPing: now
        };

      case 'START_SIMULATION':
        console.log('🎮 Reducer: START_SIMULATION');
        return {
          ...state,
          state: 'SIM_RUNNING'
        };

      case 'STOP_SIMULATION':
        console.log('🛑 Reducer: STOP_SIMULATION');
        return {
          ...state,
          state: state.portfolio && (now - state.portfolio.fetchedAt) < SIM_CONFIG.SNAPSHOT_TTL ? 'READY' : 'UNSTABLE'
        };

      default:
        return state;
    }
  }

  private async fetchPortfolioData(): Promise<void> {
    // Use central portfolio service instead of direct kucoin service
    if (this.fetchInProgress) {
      console.log('⚠️ Fetch already in progress, skipping...');
      return;
    }
    
    this.fetchInProgress = true;
    console.log('🔄 Starting fetchPortfolioData via central service...');
    
    try {
      // Update central store loading state
      useCentralPortfolioStore.getState().setLoading(true);
      
      const portfolio = await kucoinService.fetchPortfolio();
      
      console.log('✅ Portfolio data fetched via central service:', {
        totalValue: portfolio.totalValue,
        positionCount: portfolio.positions.length
      });
      
      this.fetchInProgress = false;
      this.dispatch({ type: 'FETCH_SUCCESS', payload: portfolio });
      
    } catch (error) {
      this.fetchInProgress = false;
      
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Portfolio fetch failed:', reason);
      
      this.dispatch({ type: 'FETCH_FAIL', payload: reason });
    }
  }

  
  private handleStateEffects(action: SimReadinessAction): void {
    console.log('🎯 HandleStateEffects for state:', this.status.state);
    
    switch (this.status.state) {
      case 'FETCHING':
        this.fetchPortfolioData();
        break;
        
      case 'READY':
        this.startTTLTimer();
        this.startPortfolioRefresh();
        break;
        
      case 'SIM_RUNNING':
        this.startHealthChecks();
        this.startPortfolioRefresh();
        this.startWatchdog();
        break;
        
      case 'UNSTABLE':
        this.stopAllTimers();
        this.scheduleRetry();
        break;
        
      case 'IDLE':
        this.stopAllTimers();
        break;
    }
  }

  private startTTLTimer(): void {
    this.stopTTLTimer();
    console.log('⏰ Starting TTL timer');
    this.ttlTimer = setTimeout(() => {
      console.log('⏰ Portfolio snapshot TTL exceeded');
      this.dispatch({ type: 'AGE_EXCEEDED' });
    }, SIM_CONFIG.SNAPSHOT_TTL);
  }

  private startHealthChecks(): void {
    this.stopHealthChecks();
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
    this.stopPortfolioRefresh();
    console.log('🔄 Starting portfolio refresh timer');
    this.refreshTimer = setInterval(() => {
      if (this.status.state === 'READY' || this.status.state === 'SIM_RUNNING') {
        console.log('🔄 Scheduled portfolio refresh...');
        this.fetchPortfolioData();
      }
    }, SIM_CONFIG.PORTFOLIO_REFRESH_INTERVAL);
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    console.log('🐕 Starting watchdog timer');
    this.watchdogTimer = setInterval(() => {
      if (this.status.state === 'SIM_RUNNING' && this.status.portfolio) {
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

  // Public methods
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
  }

  forceRefresh(): void {
    console.log('🔄 Forcing portfolio refresh via central service...');
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
      fetchInProgress: this.fetchInProgress
    };
  }
}

export const simReadinessStore = SimReadinessStore.getInstance();
