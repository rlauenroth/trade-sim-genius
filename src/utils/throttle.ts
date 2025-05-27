
interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): Promise<ReturnType<T>>;
  cancel(): void;
}

class ThrottleManager {
  private static instance: ThrottleManager;
  private lastCalls: Record<string, number> = {};
  private pendingCalls: Record<string, Promise<any>> = {};

  static getInstance(): ThrottleManager {
    if (!ThrottleManager.instance) {
      ThrottleManager.instance = new ThrottleManager();
    }
    return ThrottleManager.instance;
  }

  throttle<T extends (...args: any[]) => Promise<any>>(
    key: string,
    fn: T,
    delay: number
  ): ThrottledFunction<T> {
    const throttled = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const now = Date.now();
      const lastCall = this.lastCalls[key] || 0;
      const timeSinceLastCall = now - lastCall;

      // If we have a pending call for this key, return it
      if (this.pendingCalls[key]) {
        console.log(`⏳ Throttle: Reusing pending call for ${key}`);
        return this.pendingCalls[key];
      }

      // If not enough time has passed, wait
      if (timeSinceLastCall < delay) {
        const waitTime = delay - timeSinceLastCall;
        console.log(`⏳ Throttle: Waiting ${waitTime}ms for ${key}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Execute the function and cache the promise
      console.log(`🚀 Throttle: Executing ${key}`);
      this.lastCalls[key] = Date.now();
      
      const promise = fn(...args);
      this.pendingCalls[key] = promise;

      try {
        const result = await promise;
        return result;
      } finally {
        // Clear the pending call
        delete this.pendingCalls[key];
      }
    };

    throttled.cancel = () => {
      delete this.lastCalls[key];
      delete this.pendingCalls[key];
    };

    return throttled;
  }

  clear(): void {
    this.lastCalls = {};
    this.pendingCalls = {};
  }
}

export const throttleManager = ThrottleManager.getInstance();
