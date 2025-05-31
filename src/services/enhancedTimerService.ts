
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
}

class EnhancedTimerService {
  private static instance: EnhancedTimerService;
  private timers: Map<string, TimerInstance> = new Map();

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

  async executeWithProtection(
    timerId: string,
    executionFunction: () => Promise<void>
  ): Promise<void> {
    const timerInstance = this.timers.get(timerId);
    if (!timerInstance) return;

    if (timerInstance.executionLock) {
      console.log(`🔒 ${timerInstance.context} execution blocked - already running`);
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
    // Stop existing timer first
    this.stopTimer(timerId);
    
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
      executionTimes: []
    };

    const interval = this.calculateAdaptiveInterval(timerInstance.executionTimes);
    
    const intervalFunction = async () => {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      
      if (!currentState?.isActive || currentState?.isPaused) {
        this.stopTimer(timerId);
        return;
      }

      await this.executeWithProtection(timerId, executionFunction);
    };
    
    timerInstance.timer = setInterval(intervalFunction, interval);
    this.timers.set(timerId, timerInstance);
    
    console.log(`🔄 Enhanced timer started: ${context} (${timerId})`);
    loggingService.logEvent('SYSTEM', `Enhanced timer started for ${context}`, {
      timerId,
      interval
    });
    
    return true;
  }

  stopTimer(timerId: string): void {
    const timerInstance = this.timers.get(timerId);
    if (!timerInstance) return;

    if (timerInstance.timer) {
      clearInterval(timerInstance.timer);
      timerInstance.timer = null;
    }

    if (timerInstance.isRunning) {
      console.log(`🔄 Enhanced timer stopped: ${timerInstance.context} (${timerId})`);
      loggingService.logEvent('SYSTEM', `Enhanced timer stopped for ${timerInstance.context}`, { timerId });
    }

    this.timers.delete(timerId);
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
      this.stopTimer(timerId);
    }
  }
}

export const enhancedTimerService = EnhancedTimerService.getInstance();
