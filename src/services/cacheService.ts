
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
        return entry.data;
      }
    } else {
      // For top-level caches
      const entry = this.cache[key as keyof CacheStore] as CacheEntry<T>;
      
      if (entry && (now - entry.fetchedAt) < entry.ttl) {
        console.log(`📦 Cache hit: ${key}`);
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

  // Get cache stats for debugging
  getStats(): Record<string, number> {
    const now = Date.now();
    return {
      portfolioAge: this.cache.portfolio ? now - this.cache.portfolio.fetchedAt : -1,
      timestampAge: this.cache.timestamp ? now - this.cache.timestamp.fetchedAt : -1,
      allTickersAge: this.cache.allTickers ? now - this.cache.allTickers.fetchedAt : -1,
      pricesCount: Object.keys(this.cache.prices).length,
      candlesCount: Object.keys(this.cache.candles).length,
      orderbookCount: Object.keys(this.cache.orderbook).length
    };
  }
}

export const cacheService = CacheService.getInstance();

// Cache TTL constants
export const CACHE_TTL = {
  PORTFOLIO: 30 * 1000,     // 30 seconds
  TIMESTAMP: 10 * 1000,     // 10 seconds  
  ALL_TICKERS: 60 * 1000,   // 60 seconds
  PRICE: 30 * 1000,         // 30 seconds
  CANDLES: 120 * 1000,      // 2 minutes
  ORDERBOOK: 15 * 1000      // 15 seconds
};
