
import { SimReadinessState, SimReadinessStatus, SimReadinessAction } from '@/types/simReadiness';
import { kucoinService } from '@/services/kucoinService';
import { retryScheduler } from '@/services/retryScheduler';
import { useCentralPortfolioStore } from '@/stores/centralPortfolioStore';
import { SimReadinessTimerManager } from './timerManager';
import { simReadinessReducer } from './reducer';
import { FetchManager } from './fetchManager';
import { StateEffectsManager } from './stateEffectsManager';
import type { SimReadinessStoreInterface } from './types';

class SimReadinessStore implements SimReadinessStoreInterface {
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
  
  private timerManager: SimReadinessTimerManager;
  private fetchManager: FetchManager;
  private stateEffectsManager: StateEffectsManager;
  private lastStateChange: number = 0;
  private redundantDispatchPrevention: Map<string, number> = new Map();

  private constructor() {
    this.timerManager = new SimReadinessTimerManager(
      () => this.dispatch({ type: 'AGE_EXCEEDED' }),
      (reason: string) => this.dispatch({ type: 'API_DOWN', payload: reason }),
      () => {
        if (this.fetchManager.canFetch() && 
            (this.status.state === 'READY' || this.status.state === 'SIM_RUNNING')) {
          console.log('🔄 Scheduled portfolio refresh...');
          this.fetchManager.fetchPortfolioData();
        }
      }
    );

    this.fetchManager = new FetchManager(
      (portfolio) => this.dispatch({ type: 'FETCH_SUCCESS', payload: portfolio }),
      (reason) => this.dispatch({ type: 'FETCH_FAIL', payload: reason })
    );

    this.stateEffectsManager = new StateEffectsManager(
      this.timerManager,
      this.fetchManager,
      (action) => this.dispatch(action)
    );
  }

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
    
    const oldState = this.status.state;
    const newState = simReadinessReducer(this.status, action);
    
    if (newState !== this.status) {
      console.log('🔄 State transition:', oldState, '->', newState.state);
      
      this.status = newState;
      this.lastStateChange = now;
      this.notifyListeners();
      this.stateEffectsManager.handleStateEffects(newState.state, action);
    }
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
    this.timerManager.stopAllTimers();
    retryScheduler.clearRetry('sim-readiness');
    this.listeners = [];
    FetchManager.resetGlobalLock();
  }

  forceRefresh(): void {
    console.log('🔄 Forcing portfolio refresh...');
    useCentralPortfolioStore.getState().clearData();
    kucoinService.invalidateCache();
    
    if (this.status.state === 'READY' || this.status.state === 'SIM_RUNNING') {
      this.fetchManager.fetchPortfolioData();
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
      fetchInProgress: !this.fetchManager.canFetch()
    };
  }
}

export const simReadinessStore = SimReadinessStore.getInstance();
export * from './types';
