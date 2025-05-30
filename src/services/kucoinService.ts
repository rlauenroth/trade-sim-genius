
import { PortfolioSnapshot } from '@/types/simReadiness';
import { cacheService } from './cacheService';
import { throttleManager } from '@/utils/throttle';
import { ApiCallTracker } from './kucoin/apiCallTracker';
import { ProactiveRefreshManager } from './kucoin/proactiveRefresh';
import { CacheHealthManager } from './kucoin/cacheHealth';
import { PingService } from './kucoin/pingService';
import { PortfolioService } from './kucoin/portfolioService';
import { useSettingsV2Store } from '@/stores/settingsV2';

export class KuCoinService {
  private static instance: KuCoinService;
  private apiCallTracker: ApiCallTracker;
  private proactiveRefreshManager: ProactiveRefreshManager;
  private cacheHealthManager: CacheHealthManager;
  private pingService: PingService;
  private portfolioService: PortfolioService;

  constructor() {
    this.apiCallTracker = new ApiCallTracker();
    this.proactiveRefreshManager = new ProactiveRefreshManager();
    this.cacheHealthManager = new CacheHealthManager();
    this.pingService = new PingService(this.apiCallTracker);
    this.portfolioService = new PortfolioService(this.apiCallTracker);

    // Setup proactive refresh callbacks
    this.setupProactiveRefresh();
  }

  static getInstance(): KuCoinService {
    if (!KuCoinService.instance) {
      KuCoinService.instance = new KuCoinService();
    }
    return KuCoinService.instance;
  }

  // Get API keys from the centralized store
  private getApiKeys(): { apiKey: string; secret: string; passphrase: string } | null {
    try {
      const { settings } = useSettingsV2Store.getState();
      const { kucoin } = settings;
      
      if (kucoin.key && kucoin.secret && kucoin.passphrase) {
        return {
          apiKey: kucoin.key,
          secret: kucoin.secret,
          passphrase: kucoin.passphrase
        };
      }
      console.warn('⚠️ No valid API keys found in useSettingsV2Store');
      return null;
    } catch (error) {
      console.error('Error getting API keys from store:', error);
      return null;
    }
  }

  private setupProactiveRefresh(): void {
    this.proactiveRefreshManager.setupProactiveRefresh(
      () => this.portfolioService.fetchPortfolio(this.getApiKeys()),
      () => this.pingService.ping()
    );
  }

  async ping(): Promise<boolean> {
    return this.pingService.ping();
  }

  async fetchPortfolio(): Promise<PortfolioSnapshot> {
    const keys = this.getApiKeys();
    return this.portfolioService.fetchPortfolio(keys);
  }

  async getCachedPrice(symbol: string): Promise<number> {
    return this.portfolioService.getCachedPrice(symbol);
  }

  // Method to invalidate all caches (for manual refresh)
  invalidateCache(): void {
    cacheService.invalidateAll();
    throttleManager.clear();
    this.apiCallTracker.clear();
    console.log('🗑️ All KuCoin service caches invalidated');
  }

  // Get cache statistics including staleness info
  getCacheStats(): Record<string, number> {
    const stats = this.cacheHealthManager.getCacheStats();
    return {
      ...stats,
      apiCallsLast10Min: this.apiCallTracker.getApiCallsCount()
    };
  }

  // Get API call tracker for debugging
  getApiCallTracker(): { source: string; timestamp: number; endpoint: string }[] {
    return this.apiCallTracker.getApiCallTracker();
  }

  // New method to check portfolio cache health
  getPortfolioCacheHealth(): { isStale: boolean; age: number; staleness: number } {
    return this.cacheHealthManager.getPortfolioCacheHealth();
  }
}

export const kucoinService = KuCoinService.getInstance();
