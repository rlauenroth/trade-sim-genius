
import { loggingService } from '@/services/loggingService';

export interface CandidateErrorState {
  symbol: string;
  consecutiveErrors: number;
  lastErrorType: 'TIMEOUT' | 'MALFORMED_JSON' | 'AUTH_FAIL' | 'SERVER_ERROR' | 'HALLUCINATION' | 'RATE_LIMIT';
  lastErrorTimestamp: number;
  nextRetryAt: number;
  blacklistedUntil: number | null;
  totalErrors: number;
  successfulCalls: number;
}

export interface GlobalAIHealthMetrics {
  totalCalls: number;
  successfulCalls: number;
  totalErrors: number;
  lastHealthCheck: number;
  currentBlacklists: number;
  fallbacksUsed: number;
  errorsByType: Record<string, number>;
}

class CandidateErrorManager {
  private static instance: CandidateErrorManager;
  private readonly storageKey = 'kiTradingApp_candidateErrors';
  private readonly healthKey = 'kiTradingApp_aiHealthMetrics';
  private readonly maxRetries = 3;
  private readonly blacklistThreshold = 3;
  private readonly blacklistDuration = 30 * 60 * 1000; // 30 minutes
  private candidateStates = new Map<string, CandidateErrorState>();
  private healthMetrics: GlobalAIHealthMetrics;

  static getInstance(): CandidateErrorManager {
    if (!CandidateErrorManager.instance) {
      CandidateErrorManager.instance = new CandidateErrorManager();
    }
    return CandidateErrorManager.instance;
  }

  constructor() {
    this.healthMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      totalErrors: 0,
      lastHealthCheck: Date.now(),
      currentBlacklists: 0,
      fallbacksUsed: 0,
      errorsByType: {}
    };
    this.loadFromStorage();
    this.cleanupExpiredBlacklists();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([symbol, state]) => {
          this.candidateStates.set(symbol, state as CandidateErrorState);
        });
      }

      const healthStored = localStorage.getItem(this.healthKey);
      if (healthStored) {
        this.healthMetrics = { ...this.healthMetrics, ...JSON.parse(healthStored) };
      }
    } catch (error) {
      loggingService.logError('Failed to load candidate error states', { error });
    }
  }

  private saveToStorage(): void {
    try {
      const stateObj = Object.fromEntries(this.candidateStates);
      localStorage.setItem(this.storageKey, JSON.stringify(stateObj));
      localStorage.setItem(this.healthKey, JSON.stringify(this.healthMetrics));
    } catch (error) {
      loggingService.logError('Failed to save candidate error states', { error });
    }
  }

  private cleanupExpiredBlacklists(): void {
    const now = Date.now();
    let cleanupCount = 0;

    this.candidateStates.forEach((state, symbol) => {
      if (state.blacklistedUntil && state.blacklistedUntil < now) {
        state.blacklistedUntil = null;
        state.consecutiveErrors = 0;
        cleanupCount++;
      }
    });

    if (cleanupCount > 0) {
      this.updateBlacklistCount();
      this.saveToStorage();
      loggingService.logInfo(`Cleaned up ${cleanupCount} expired blacklists`);
    }
  }

  private updateBlacklistCount(): void {
    this.healthMetrics.currentBlacklists = Array.from(this.candidateStates.values())
      .filter(state => state.blacklistedUntil && state.blacklistedUntil > Date.now()).length;
  }

  recordError(symbol: string, errorType: CandidateErrorState['lastErrorType']): boolean {
    const now = Date.now();
    let state = this.candidateStates.get(symbol);

    if (!state) {
      state = {
        symbol,
        consecutiveErrors: 0,
        lastErrorType: errorType,
        lastErrorTimestamp: now,
        nextRetryAt: now,
        blacklistedUntil: null,
        totalErrors: 0,
        successfulCalls: 0
      };
      this.candidateStates.set(symbol, state);
    }

    state.consecutiveErrors++;
    state.totalErrors++;
    state.lastErrorType = errorType;
    state.lastErrorTimestamp = now;
    
    // Calculate next retry time with exponential backoff
    const baseDelay = Math.min(2000 * Math.pow(2, state.consecutiveErrors - 1), 30000);
    const jitter = Math.random() * 1000;
    state.nextRetryAt = now + baseDelay + jitter;

    // Check if blacklisting is needed
    let shouldBlacklist = false;
    if (state.consecutiveErrors >= this.blacklistThreshold) {
      state.blacklistedUntil = now + this.blacklistDuration;
      shouldBlacklist = true;
      
      loggingService.logEvent('AI', 'Symbol blacklisted due to consecutive errors', {
        symbol,
        consecutiveErrors: state.consecutiveErrors,
        errorType,
        blacklistedUntil: new Date(state.blacklistedUntil).toISOString()
      });
    }

    // Update global metrics
    this.healthMetrics.totalErrors++;
    this.healthMetrics.errorsByType[errorType] = (this.healthMetrics.errorsByType[errorType] || 0) + 1;
    this.updateBlacklistCount();
    
    this.saveToStorage();
    return shouldBlacklist;
  }

  recordSuccess(symbol: string): void {
    let state = this.candidateStates.get(symbol);
    
    if (!state) {
      state = {
        symbol,
        consecutiveErrors: 0,
        lastErrorType: 'TIMEOUT',
        lastErrorTimestamp: 0,
        nextRetryAt: 0,
        blacklistedUntil: null,
        totalErrors: 0,
        successfulCalls: 0
      };
      this.candidateStates.set(symbol, state);
    }

    state.consecutiveErrors = 0;
    state.successfulCalls++;
    state.nextRetryAt = Date.now();
    
    // Remove blacklist on success
    if (state.blacklistedUntil) {
      state.blacklistedUntil = null;
      loggingService.logEvent('AI', 'Symbol recovered from blacklist', { symbol });
    }

    this.healthMetrics.successfulCalls++;
    this.updateBlacklistCount();
    this.saveToStorage();
  }

  recordFallbackUsed(): void {
    this.healthMetrics.fallbacksUsed++;
    this.saveToStorage();
  }

  canRetry(symbol: string): boolean {
    const state = this.candidateStates.get(symbol);
    if (!state) return true;

    const now = Date.now();
    
    // Check blacklist
    if (state.blacklistedUntil && state.blacklistedUntil > now) {
      return false;
    }

    // Check retry timing
    return now >= state.nextRetryAt;
  }

  isBlacklisted(symbol: string): boolean {
    const state = this.candidateStates.get(symbol);
    if (!state) return false;
    
    return state.blacklistedUntil !== null && state.blacklistedUntil > Date.now();
  }

  getErrorState(symbol: string): CandidateErrorState | null {
    return this.candidateStates.get(symbol) || null;
  }

  getHealthMetrics(): GlobalAIHealthMetrics {
    this.healthMetrics.lastHealthCheck = Date.now();
    return { ...this.healthMetrics };
  }

  getSuccessRate(): number {
    if (this.healthMetrics.totalCalls === 0) return 1;
    return this.healthMetrics.successfulCalls / this.healthMetrics.totalCalls;
  }

  clearBlacklist(symbol: string): void {
    const state = this.candidateStates.get(symbol);
    if (state) {
      state.blacklistedUntil = null;
      state.consecutiveErrors = 0;
      this.updateBlacklistCount();
      this.saveToStorage();
      
      loggingService.logEvent('AI', 'Blacklist manually cleared', { symbol });
    }
  }

  getBlacklistedSymbols(): string[] {
    const now = Date.now();
    return Array.from(this.candidateStates.entries())
      .filter(([, state]) => state.blacklistedUntil && state.blacklistedUntil > now)
      .map(([symbol]) => symbol);
  }
}

export const candidateErrorManager = CandidateErrorManager.getInstance();
