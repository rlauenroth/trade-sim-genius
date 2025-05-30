
import { kucoinService } from '@/services/kucoinService';
import { SIM_CONFIG } from '@/services/cacheService';
import type { TimerManager } from './types';

export class SimReadinessTimerManager implements TimerManager {
  private ttlTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;

  constructor(
    private onAgeExceeded: () => void,
    private onApiDown: (reason: string) => void,
    private onPortfolioRefresh: () => void
  ) {}

  stopAllTimers(): void {
    this.stopTTLTimer();
    this.stopHealthChecks();
    this.stopPortfolioRefresh();
    this.stopWatchdog();
  }

  startTTLTimer(): void {
    if (this.ttlTimer) return;
    console.log('⏰ Starting TTL timer');
    this.ttlTimer = setTimeout(() => {
      console.log('⏰ Portfolio snapshot TTL exceeded');
      this.onAgeExceeded();
    }, SIM_CONFIG.SNAPSHOT_TTL);
  }

  startHealthChecks(): void {
    if (this.healthCheckTimer) return;
    console.log('🏥 Starting health checks');
    this.healthCheckTimer = setInterval(async () => {
      try {
        await kucoinService.ping();
        console.log('✅ Health check passed');
      } catch (error) {
        console.error('❌ Health check failed:', error);
        this.onApiDown('API health check failed');
      }
    }, 30 * 1000);
  }

  startPortfolioRefresh(): void {
    if (this.refreshTimer) return;
    console.log('🔄 Starting portfolio refresh timer');
    this.refreshTimer = setInterval(() => {
      this.onPortfolioRefresh();
    }, SIM_CONFIG.PORTFOLIO_REFRESH_INTERVAL);
  }

  startWatchdog(): void {
    if (this.watchdogTimer) return;
    console.log('🐕 Starting watchdog timer');
    this.watchdogTimer = setInterval(() => {
      this.onPortfolioRefresh();
    }, SIM_CONFIG.WATCHDOG_INTERVAL);
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
}
