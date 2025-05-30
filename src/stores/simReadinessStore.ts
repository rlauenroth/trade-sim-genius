import { SimReadinessState, SimReadinessStatus, SimReadinessAction, PortfolioSnapshot } from '@/types/simReadiness';
import { kucoinService } from '@/services/kucoinService';
import { retryScheduler } from '@/services/retryScheduler';
import { RateLimitError, ProxyError, ApiError } from '@/utils/errors';
import { SIM_CONFIG } from '@/services/cacheService';
import { loggingService } from '@/services/loggingService';

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
    loggingService.logEvent('SIM', `SimReadiness action: ${action.type}`, { action });
    
    // Log current state before reducer
    console.log('📊 Current state before reducer:', {
      currentState: this.status.state,
      portfolioExists: !!this.status.portfolio,
      fetchInProgress: this.fetchInProgress,
      timers: this.getTimerStatus()
    });
    
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
        console.log('🚀 Reducer: INIT action');
        return {
          ...state,
          state: 'FETCHING',
          reason: 'Initializing...',
          retryCount: 0
        };

      case 'FETCH_SUCCESS':
        console.log('✅ Reducer: FETCH_SUCCESS action with payload:', action.payload);
        
        // Validate payload before processing
        const validationResult = this.validatePortfolioSnapshot(action.payload);
        if (!validationResult.isValid) {
          console.error('❌ Reducer: Invalid portfolio snapshot:', validationResult.reason);
          loggingService.logError('Invalid portfolio snapshot in FETCH_SUCCESS', {
            reason: validationResult.reason,
            payload: action.payload
          });
          
          return {
            ...state,
            state: 'UNSTABLE',
            reason: `Invalid portfolio data: ${validationResult.reason}`,
            retryCount: state.retryCount + 1
          };
        }
        
        console.log('✅ Reducer: Portfolio snapshot validated, transitioning to READY');
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

  private validatePortfolioSnapshot(snapshot: PortfolioSnapshot): { isValid: boolean; reason?: string } {
    if (!snapshot) {
      return { isValid: false, reason: 'Snapshot is null or undefined' };
    }
    
    if (typeof snapshot.totalValue !== 'number' || isNaN(snapshot.totalValue) || snapshot.totalValue < 0) {
      return { isValid: false, reason: 'Invalid totalValue' };
    }
    
    if (!Array.isArray(snapshot.positions)) {
      return { isValid: false, reason: 'Positions is not an array' };
    }
    
    if (typeof snapshot.cashUSDT !== 'number' || isNaN(snapshot.cashUSDT) || snapshot.cashUSDT < 0) {
      return { isValid: false, reason: 'Invalid cashUSDT' };
    }
    
    if (!snapshot.fetchedAt || typeof snapshot.fetchedAt !== 'number' || snapshot.fetchedAt <= 0) {
      return { isValid: false, reason: 'Invalid fetchedAt timestamp' };
    }
    
    // Validate individual positions
    for (const position of snapshot.positions) {
      if (!position.currency || typeof position.currency !== 'string') {
        return { isValid: false, reason: 'Position has invalid currency' };
      }
      
      if (typeof position.balance !== 'number' || isNaN(position.balance) || position.balance < 0) {
        return { isValid: false, reason: `Invalid balance for ${position.currency}` };
      }
      
      if (typeof position.usdValue !== 'number' || isNaN(position.usdValue) || position.usdValue < 0) {
        return { isValid: false, reason: `Invalid usdValue for ${position.currency}` };
      }
    }
    
    return { isValid: true };
  }

  private handleStateEffects(action: SimReadinessAction): void {
    console.log('🎯 HandleStateEffects for state:', this.status.state);
    loggingService.logEvent('SIM', `HandleStateEffects: ${this.status.state}`, {
      state: this.status.state,
      timers: this.getTimerStatus()
    });
    
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
    // Prevent concurrent fetches
    if (this.fetchInProgress) {
      console.log('⚠️ Fetch already in progress, skipping...');
      return;
    }
    
    this.fetchInProgress = true;
    console.log('🔄 Starting fetchPortfolioData...');
    loggingService.logEvent('SIM', 'fetchPortfolioData started');
    
    // Set fetch timeout (30 seconds)
    this.clearFetchTimeout();
    this.fetchTimeout = setTimeout(() => {
      console.error('⏰ Portfolio fetch timeout after 30 seconds');
      loggingService.logError('Portfolio fetch timeout', { timeout: 30000 });
      this.fetchInProgress = false;
      this.dispatch({ type: 'FETCH_FAIL', payload: 'Portfolio fetch timeout (30s)' });
    }, 30000);
    
    try {
      // Step 1: Test API connectivity
      console.log('🏓 Testing API connectivity...');
      await kucoinService.ping();
      console.log('✅ API ping successful');
      
      // Step 2: Fetch portfolio data
      console.log('📊 Fetching portfolio data from kucoinService...');
      const portfolioStartTime = Date.now();
      
      const portfolio = await kucoinService.fetchPortfolio();
      
      const portfolioFetchTime = Date.now() - portfolioStartTime;
      console.log('✅ Portfolio data fetched successfully in', portfolioFetchTime, 'ms:', {
        totalValue: portfolio.totalValue,
        positionCount: portfolio.positions.length,
        cashUSDT: portfolio.cashUSDT,
        fetchedAt: portfolio.fetchedAt
      });
      
      loggingService.logEvent('SIM', 'Portfolio fetch successful', {
        totalValue: portfolio.totalValue,
        positionCount: portfolio.positions.length,
        fetchTime: portfolioFetchTime
      });
      
      // Clear fetch timeout before dispatching success
      this.clearFetchTimeout();
      this.fetchInProgress = false;
      
      console.log('📤 Dispatching FETCH_SUCCESS with portfolio data...');
      this.dispatch({ type: 'FETCH_SUCCESS', payload: portfolio });
      
    } catch (error) {
      this.clearFetchTimeout();
      this.fetchInProgress = false;
      
      console.error('❌ Portfolio fetch failed:', error);
      loggingService.logError('Portfolio fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      let reason = 'Unknown error';
      if (error instanceof RateLimitError) {
        reason = `Rate limit exceeded. Retry in ${error.retryAfter}s`;
      } else if (error instanceof ProxyError) {
        reason = 'KuCoin API proxy unreachable';
      } else if (error instanceof ApiError) {
        reason = `API Error: ${error.status}`;
      } else if (error instanceof Error) {
        reason = error.message;
      }
      
      console.log('📤 Dispatching FETCH_FAIL with reason:', reason);
      this.dispatch({ type: 'FETCH_FAIL', payload: reason });
    }
  }

  private clearFetchTimeout(): void {
    if (this.fetchTimeout) {
      clearTimeout(this.fetchTimeout);
      this.fetchTimeout = null;
    }
  }

  private getTimerStatus() {
    return {
      ttlTimer: !!this.ttlTimer,
      healthCheckTimer: !!this.healthCheckTimer,
      refreshTimer: !!this.refreshTimer,
      watchdogTimer: !!this.watchdogTimer,
      fetchTimeout: !!this.fetchTimeout
    };
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
      console.log('🛑 TTL timer stopped');
    }
  }

  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('🛑 Health checks stopped');
    }
  }

  private stopPortfolioRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('🛑 Portfolio refresh timer stopped');
    }
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
      console.log('🛑 Watchdog timer stopped');
    }
  }

  private stopAllTimers(): void {
    console.log('🛑 Stopping all timers');
    this.stopTTLTimer();
    this.stopHealthChecks();
    this.stopPortfolioRefresh();
    this.stopWatchdog();
    this.clearFetchTimeout();
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
      timers: this.getTimerStatus(),
      fetchInProgress: this.fetchInProgress,
      config: SIM_CONFIG
    };
  }
}

export const simReadinessStore = SimReadinessStore.getInstance();
