
import { SimReadinessState, SimReadinessStatus, SimReadinessAction, PortfolioSnapshot } from '@/types/simReadiness';
import { kucoinService } from '@/services/kucoinService';
import { retryScheduler } from '@/services/retryScheduler';
import { RateLimitError, ProxyError, ApiError } from '@/utils/errors';
import { SIM_CONFIG } from '@/services/cacheService';

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

  static getInstance(): SimReadinessStore {
    if (!SimReadinessStore.instance) {
      SimReadinessStore.instance = new SimReadinessStore();
    }
    return SimReadinessStore.instance;
  }

  subscribe(listener: (status: SimReadinessStatus) => void) {
    this.listeners.push(listener);
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
    const snapshotAge = this.status.portfolio ? now - this.status.portfolio.fetchedAt : 0;
    
    return {
      ...this.status,
      snapshotAge
    };
  }

  dispatch(action: SimReadinessAction): void {
    console.log('🔄 SimReadiness action:', action.type, action);
    
    const newState = this.reducer(this.status, action);
    if (newState !== this.status) {
      this.status = newState;
      this.notifyListeners();
      this.handleStateEffects(action);
    }
  }

  private reducer(state: SimReadinessStatus, action: SimReadinessAction): SimReadinessStatus {
    const now = Date.now();
    
    switch (action.type) {
      case 'INIT':
        return {
          ...state,
          state: 'FETCHING',
          reason: 'Initializing...',
          retryCount: 0
        };

      case 'FETCH_SUCCESS':
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

  private handleStateEffects(action: SimReadinessAction): void {
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

  private async fetchPortfolioData(): Promise<void> {
    try {
      // Use cached ping first
      await kucoinService.ping();
      
      // Then fetch portfolio (will use cache if available)
      const portfolio = await kucoinService.fetchPortfolio();
      
      this.dispatch({ type: 'FETCH_SUCCESS', payload: portfolio });
    } catch (error) {
      console.error('Portfolio fetch failed:', error);
      
      let reason = 'Unknown error';
      if (error instanceof RateLimitError) {
        reason = `Rate limit exceeded. Retry in ${error.retryAfter}s`;
      } else if (error instanceof ProxyError) {
        reason = 'KuCoin API proxy unreachable';
      } else if (error instanceof ApiError) {
        reason = `API Error: ${error.status}`;
      }
      
      this.dispatch({ type: 'FETCH_FAIL', payload: reason });
    }
  }

  private startTTLTimer(): void {
    this.stopTTLTimer();
    
    this.ttlTimer = setTimeout(() => {
      console.log('⏰ Portfolio snapshot TTL exceeded');
      this.dispatch({ type: 'AGE_EXCEEDED' });
    }, SIM_CONFIG.SNAPSHOT_TTL);
  }

  private startHealthChecks(): void {
    this.stopHealthChecks();
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        // Use cached ping to reduce API calls
        await kucoinService.ping();
        console.log('✅ Health check passed (cached)');
      } catch (error) {
        console.error('❌ Health check failed:', error);
        this.dispatch({ type: 'API_DOWN', payload: 'API health check failed' });
      }
    }, 30 * 1000); // 30 seconds
  }

  private startPortfolioRefresh(): void {
    this.stopPortfolioRefresh();
    
    this.refreshTimer = setInterval(() => {
      if (this.status.state === 'READY' || this.status.state === 'SIM_RUNNING') {
        console.log('🔄 Scheduled portfolio refresh...');
        this.fetchPortfolioData();
      }
    }, SIM_CONFIG.PORTFOLIO_REFRESH_INTERVAL);
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    
    this.watchdogTimer = setInterval(() => {
      if (this.status.state === 'SIM_RUNNING' && this.status.portfolio) {
        const now = Date.now();
        const age = now - this.status.portfolio.fetchedAt;
        const dangerZone = SIM_CONFIG.SNAPSHOT_TTL - SIM_CONFIG.REFRESH_MARGIN;
        
        console.log(`🐕 Watchdog check: Portfolio age ${Math.round(age/1000)}s, danger zone: ${dangerZone/1000}s`);
        
        if (age >= dangerZone) {
          console.log('⚠️ Watchdog triggered early refresh to prevent simulation pause');
          this.fetchPortfolioData();
        }
        
        // Log cache health for debugging
        const cacheHealth = kucoinService.getPortfolioCacheHealth();
        console.log('📊 Cache health:', cacheHealth);
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

  // Public methods for external control
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

  // Add method to get cache stats including new metrics
  getCacheStats(): Record<string, number> {
    const baseStats = kucoinService.getCacheStats();
    const cacheHealth = kucoinService.getPortfolioCacheHealth();
    
    return {
      ...baseStats,
      cacheIsStale: cacheHealth.isStale ? 1 : 0,
      cacheStaleness: cacheHealth.staleness
    };
  }

  // Add method to manually refresh data with improved logging
  forceRefresh(): void {
    console.log('🔄 Forcing cache refresh and portfolio update...');
    kucoinService.invalidateCache();
    
    if (this.status.state === 'READY' || this.status.state === 'SIM_RUNNING') {
      this.fetchPortfolioData();
    }
  }

  // New method to get detailed status for debugging
  getDetailedStatus(): Record<string, any> {
    const status = this.getStatus();
    const cacheStats = this.getCacheStats();
    
    return {
      ...status,
      cacheStats,
      timers: {
        ttlTimer: !!this.ttlTimer,
        healthCheckTimer: !!this.healthCheckTimer,
        refreshTimer: !!this.refreshTimer,
        watchdogTimer: !!this.watchdogTimer
      },
      config: SIM_CONFIG
    };
  }
}

export const simReadinessStore = SimReadinessStore.getInstance();
