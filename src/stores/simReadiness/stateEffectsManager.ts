
import { SimReadinessState, SimReadinessAction } from '@/types/simReadiness';
import { retryScheduler } from '@/services/retryScheduler';
import { kucoinService } from '@/services/kucoinService';
import type { TimerManager } from './types';
import type { FetchManager } from './fetchManager';

export class StateEffectsManager {
  constructor(
    private timerManager: TimerManager,
    private fetchManager: FetchManager,
    private dispatch: (action: SimReadinessAction) => void
  ) {}

  handleStateEffects(state: SimReadinessState, action: SimReadinessAction): void {
    console.log('🎯 HandleStateEffects for state:', state);
    
    // Stop all timers first to prevent conflicts
    this.timerManager.stopAllTimers();
    
    switch (state) {
      case 'FETCHING':
        this.fetchManager.fetchPortfolioData();
        break;
        
      case 'READY':
        this.timerManager.startTTLTimer();
        this.timerManager.startPortfolioRefresh();
        break;
        
      case 'SIM_RUNNING':
        this.timerManager.startHealthChecks();
        this.timerManager.startPortfolioRefresh();
        this.timerManager.startWatchdog();
        break;
        
      case 'UNSTABLE':
        this.scheduleRetry();
        break;
        
      case 'IDLE':
        // No timers needed for IDLE state
        break;
    }
  }

  private scheduleRetry(): void {
    if (!retryScheduler.canRetry(0)) { // Pass actual retry count from state
      console.log('❌ Max retry attempts reached');
      return;
    }

    const delay = retryScheduler.getNextDelay(0);
    
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
}
