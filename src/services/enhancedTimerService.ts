
import { loggingService } from '@/services/loggingService';

interface TimerInstance {
  id: string;
  timer: NodeJS.Timeout | null;
  isRunning: boolean;
  context: string;
  executionLock: boolean;
  lastExecution: number;
  executionCount: number;
  executionTimes: number[];
  lastStartTime: number;
}

class EnhancedTimerService {
  private static instance: EnhancedTimerService;
  private timers: Map<string, TimerInstance> = new Map();
  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): EnhancedTimerService {
    if (!EnhancedTimerService.instance) {
      EnhancedTimerService.instance = new EnhancedTimerService();
    }
    return EnhancedTimerService.instance;
  }

  private calculateAdaptiveInterval(executionTimes: number[]): number {
    const baseInterval = 30000; // 30s base
    
    if (executionTimes.length === 0) return baseInterval;
    
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    
    if (avgTime > 10000) {
      const factor = Math.min(avgTime / 10000, 3);
      return Math.round(baseInterval * factor);
    }
    
    return baseInterval;
  }

  private shouldLogTimerOperation(timerId: string, operation: 'start' | 'stop'): boolean {
    const timerInstance = this.timers.get(timerId);
    if (!timerInstance) return true;

    // Only log if there was a significant time gap since last operation
    const timeSinceLastStart = Date.now() - timerInstance.lastStartTime;
    return timeSinceLastStart > 5000; // 5 seconds threshold
  }

  async executeWithProtection(
    timerId: string,
    executionFunction: () => Promise<void>
  ): Promise<void> {
    const timerInstance = this.timers.get(timerId);
    if (!timerInstance) return;

    if (timerInstance.executionLock) {
      return;
    }

    const startTime = Date.now();
    timerInstance.executionLock = true;

    try {
      await executionFunction();
      
      const executionTime = Date.now() - startTime;
      timerInstance.executionTimes = [
        ...timerInstance.executionTimes.slice(-9),
        executionTime
      ];
      timerInstance.lastExecution = startTime;
      timerInstance.executionCount++;
      
    } catch (error) {
      console.error(`❌ ${timerInstance.context} execution failed:`, error);
      loggingService.logError(`${timerInstance.context} execution failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      });
    } finally {
      timerInstance.executionLock = false;
    }
  }

  startTimer(
    timerId: string,
    isActive: boolean,
    simulationState: any,
    executionFunction: () => Promise<void>,
    context: string = 'AI Signal Generation'
  ): boolean {
    // Check if timer is already running with same parameters
    const existingTimer = this.timers.get(timerId);
    if (existingTimer && existingTimer.isRunning) {
      return false; // Already running, no need to restart
    }

    // Clear any existing debounce timeout
    const existingDebounce = this.debounceTimeouts.get(timerId);
    if (existingDebounce) {
      clearTimeout(existingDebounce);
      this.debounceTimeouts.delete(timerId);
    }

    // Stop existing timer first (silent)
    this.stopTimer(timerId, true);
    
    if (!isActive || !simulationState?.isActive || simulationState?.isPaused) {
      return false;
    }

    const timerInstance: TimerInstance = {
      id: timerId,
      timer: null,
      isRunning: true,
      context,
      executionLock: false,
      lastExecution: 0,
      executionCount: 0,
      executionTimes: [],
      lastStartTime: Date.now()
    };

    const interval = this.calculateAdaptiveInterval(timerInstance.executionTimes);
    
    const intervalFunction = async () => {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      
      if (!currentState?.isActive || currentState?.isPaused) {
        this.stopTimer(timerId, true);
        return;
      }

      await this.executeWithProtection(timerId, executionFunction);
    };
    
    timerInstance.timer = setInterval(intervalFunction, interval);
    this.timers.set(timerId, timerInstance);
    
    // Only log if this is a significant operation
    if (this.shouldLogTimerOperation(timerId, 'start')) {
      console.log(`🔄 Enhanced timer started: ${context} (${timerId})`);
      loggingService.logEvent('SYSTEM', `Enhanced timer started for ${context}`, {
        timerId,
        interval
      });
    }
    
    return true;
  }

  stopTimer(timerId: string, silent: boolean = false): void {
    const timerInstance = this.timers.get(timerId);
    if (!timerInstance) return;

    if (timerInstance.timer) {
      clearInterval(timerInstance.timer);
      timerInstance.timer = null;
    }

    const wasRunning = timerInstance.isRunning;
    this.timers.delete(timerId);

    // Only log if this was actually running and not silent
    if (wasRunning && !silent && this.shouldLogTimerOperation(timerId, 'stop')) {
      console.log(`🔄 Enhanced timer stopped: ${timerInstance.context} (${timerId})`);
      loggingService.logEvent('SYSTEM', `Enhanced timer stopped for ${timerInstance.context}`, { timerId });
    }
  }

  getTimerState(timerId: string) {
    const timerInstance = this.timers.get(timerId);
    if (!timerInstance) {
      return {
        isRunning: false,
        lastExecution: 0,
        executionCount: 0,
        averageExecutionTime: 0
      };
    }

    return {
      isRunning: timerInstance.isRunning,
      lastExecution: timerInstance.lastExecution,
      executionCount: timerInstance.executionCount,
      averageExecutionTime: timerInstance.executionTimes.length > 0 
        ? timerInstance.executionTimes.reduce((a, b) => a + b, 0) / timerInstance.executionTimes.length 
        : 0
    };
  }

  forceExecution(timerId: string, executionFunction: () => Promise<void>): Promise<void> {
    return this.executeWithProtection(timerId, executionFunction);
  }

  stopAllTimers(): void {
    for (const [timerId] of this.timers) {
      this.stopTimer(timerId, true);
    }
  }
}

export const enhancedTimerService = EnhancedTimerService.getInstance();
