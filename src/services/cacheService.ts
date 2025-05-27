
interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  ttl: number;
}

interface CacheStore {
  portfolio?: CacheEntry<any>;
  timestamp?: CacheEntry<number>;
  allTickers?: CacheEntry<any[]>;
  prices: Record<string, CacheEntry<number>>;
  candles: Record<string, CacheEntry<any[]>>;
  orderbook: Record<string, CacheEntry<any>>;
}

class CacheService {
  private static instance: CacheService;
  private cache: CacheStore = {
    prices: {},
    candles: {},
    orderbook: {}
  };
  private proactiveRefreshCallbacks: Map<string, () => Promise<void>> = new Map();

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  get<T>(key: string, subKey?: string): T | null {
    const now = Date.now();
    
    if (subKey) {
      // For nested caches like prices, candles, orderbook
      const nestedCache = this.cache[key as keyof CacheStore] as Record<string, CacheEntry<T>>;
      const entry = nestedCache?.[subKey];
      
      if (entry && (now - entry.fetchedAt) < entry.ttl) {
        console.log(`📦 Cache hit: ${key}[${subKey}]`);
        this.checkProactiveRefresh(key, entry, subKey);
        return entry.data;
      }
    } else {
      // For top-level caches
      const entry = this.cache[key as keyof CacheStore] as CacheEntry<T>;
      
      if (entry && (now - entry.fetchedAt) < entry.ttl) {
        console.log(`📦 Cache hit: ${key}`);
        this.checkProactiveRefresh(key, entry);
        return entry.data;
      }
    }
    
    return null;
  }

  set<T>(key: string, data: T, ttl: number, subKey?: string): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      fetchedAt: now,
      ttl
    };

    if (subKey) {
      // For nested caches
      const nestedCache = this.cache[key as keyof CacheStore] as Record<string, CacheEntry<T>>;
      if (!nestedCache) {
        (this.cache as any)[key] = {};
      }
      (this.cache as any)[key][subKey] = entry;
      console.log(`📝 Cache set: ${key}[${subKey}] (TTL: ${ttl}ms)`);
    } else {
      // For top-level caches
      (this.cache as any)[key] = entry;
      console.log(`📝 Cache set: ${key} (TTL: ${ttl}ms)`);
    }
  }

  private checkProactiveRefresh<T>(key: string, entry: CacheEntry<T>, subKey?: string): void {
    const now = Date.now();
    const age = now - entry.fetchedAt;
    const refreshThreshold = entry.ttl * 0.75; // 75% of TTL
    
    if (age >= refreshThreshold) {
      const cacheKey = subKey ? `${key}[${subKey}]` : key;
      const callback = this.proactiveRefreshCallbacks.get(cacheKey);
      
      if (callback) {
        console.log(`⚡ Triggering proactive refresh for ${cacheKey} (age: ${age}ms, threshold: ${refreshThreshold}ms)`);
        callback().catch(error => {
          console.error(`❌ Proactive refresh failed for ${cacheKey}:`, error);
        });
      }
    }
  }

  registerProactiveRefresh(key: string, callback: () => Promise<void>, subKey?: string): void {
    const cacheKey = subKey ? `${key}[${subKey}]` : key;
    this.proactiveRefreshCallbacks.set(cacheKey, callback);
    console.log(`🔔 Proactive refresh registered for ${cacheKey}`);
  }

  invalidate(key: string, subKey?: string): void {
    if (subKey) {
      const nestedCache = this.cache[key as keyof CacheStore] as Record<string, any>;
      if (nestedCache && nestedCache[subKey]) {
        delete nestedCache[subKey];
        console.log(`🗑️ Cache invalidated: ${key}[${subKey}]`);
      }
    } else {
      delete (this.cache as any)[key];
      console.log(`🗑️ Cache invalidated: ${key}`);
    }
  }

  invalidateAll(): void {
    this.cache = {
      prices: {},
      candles: {},
      orderbook: {}
    };
    console.log('🗑️ All cache invalidated');
  }

  // Get cache stats for debugging including staleness info
  getStats(): Record<string, number> {
    const now = Date.now();
    const portfolioAge = this.cache.portfolio ? now - this.cache.portfolio.fetchedAt : -1;
    const portfolioStaleness = this.cache.portfolio ? portfolioAge / this.cache.portfolio.ttl : -1;
    
    return {
      portfolioAge,
      portfolioStaleness: Math.round(portfolioStaleness * 100), // percentage
      timestampAge: this.cache.timestamp ? now - this.cache.timestamp.fetchedAt : -1,
      allTickersAge: this.cache.allTickers ? now - this.cache.allTickers.fetchedAt : -1,
      pricesCount: Object.keys(this.cache.prices).length,
      candlesCount: Object.keys(this.cache.candles).length,
      orderbookCount: Object.keys(this.cache.orderbook).length
    };
  }

  // Check if cache entry is stale (>75% of TTL)
  isStale(key: string, subKey?: string): boolean {
    const now = Date.now();
    
    if (subKey) {
      const nestedCache = this.cache[key as keyof CacheStore] as Record<string, any>;
      const entry = nestedCache?.[subKey];
      if (!entry) return true;
      return (now - entry.fetchedAt) > (entry.ttl * 0.75);
    } else {
      const entry = this.cache[key as keyof CacheStore] as any;
      if (!entry) return true;
      return (now - entry.fetchedAt) > (entry.ttl * 0.75);
    }
  }
}

export const cacheService = CacheService.getInstance();

// Updated Cache TTL constants - harmonized values
export const CACHE_TTL = {
  PORTFOLIO: 45 * 1000,     // Increased from 30s to 45s (gives 15s buffer)
  TIMESTAMP: 10 * 1000,     // 10 seconds  
  ALL_TICKERS: 60 * 1000,   // 60 seconds
  PRICE: 30 * 1000,         // 30 seconds
  CANDLES: 120 * 1000,      // 2 minutes
  ORDERBOOK: 15 * 1000      // 15 seconds
};

// Simulation configuration constants
export const SIM_CONFIG = {
  SNAPSHOT_TTL: 60 * 1000,           // 60 seconds (SimReadiness ultimate limit)
  REFRESH_MARGIN: 15 * 1000,         // 15 seconds buffer before TTL
  PORTFOLIO_REFRESH_INTERVAL: 45 * 1000,  // 45 seconds (proactive refresh)
  WATCHDOG_INTERVAL: 10 * 1000,      // 10 seconds watchdog checks
  PROACTIVE_REFRESH_THRESHOLD: 0.75  // 75% of TTL triggers proactive refresh
};
