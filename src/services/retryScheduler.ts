
import { RateLimitError } from '@/utils/errors';

const RETRY_DELAYS = [2, 4, 8, 16, 32]; // seconds
const MAX_RETRY_ATTEMPTS = 5;

export class RetryScheduler {
  private static instance: RetryScheduler;
  private activeTimeouts = new Map<string, NodeJS.Timeout>();

  static getInstance(): RetryScheduler {
    if (!RetryScheduler.instance) {
      RetryScheduler.instance = new RetryScheduler();
    }
    return RetryScheduler.instance;
  }

  getNextDelay(attempt: number): number {
    const delayIndex = Math.min(attempt, RETRY_DELAYS.length - 1);
    return RETRY_DELAYS[delayIndex] * 1000; // Convert to milliseconds
  }

  getRateLimitDelay(error: RateLimitError, attempt: number): number {
    const standardDelay = this.getNextDelay(attempt);
    const rateLimitDelay = error.retryAfter * 1000;
    return Math.max(standardDelay, rateLimitDelay);
  }

  scheduleRetry(
    key: string, 
    callback: () => void, 
    delay: number
  ): void {
    // Clear any existing timeout for this key
    this.clearRetry(key);
    
    console.log(`⏰ Scheduling retry for ${key} in ${delay}ms`);
    
    const timeout = setTimeout(() => {
      this.activeTimeouts.delete(key);
      callback();
    }, delay);
    
    this.activeTimeouts.set(key, timeout);
  }

  clearRetry(key: string): void {
    const timeout = this.activeTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(key);
    }
  }

  clearAllRetries(): void {
    this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.activeTimeouts.clear();
  }

  canRetry(attempt: number): boolean {
    return attempt < MAX_RETRY_ATTEMPTS;
  }
}

export const retryScheduler = RetryScheduler.getInstance();
