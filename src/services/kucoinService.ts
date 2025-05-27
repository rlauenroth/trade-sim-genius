import { kucoinFetch, getPrice } from '@/utils/kucoinProxyApi';
import { PortfolioSnapshot } from '@/types/simReadiness';
import { ApiError, RateLimitError, ProxyError } from '@/utils/errors';
import { cacheService, CACHE_TTL } from './cacheService';
import { throttleManager } from '@/utils/throttle';

export class KuCoinService {
  private static instance: KuCoinService;
  private throttledPing: ReturnType<typeof throttleManager.throttle>;
  private apiCallTracker: { source: string; timestamp: number; endpoint: string }[] = [];

  constructor() {
    // Create throttled ping function (max 1 call per 10 seconds)
    this.throttledPing = throttleManager.throttle(
      'kucoin-ping',
      this.executePing.bind(this),
      CACHE_TTL.TIMESTAMP
    );
  }

  static getInstance(): KuCoinService {
    if (!KuCoinService.instance) {
      KuCoinService.instance = new KuCoinService();
    }
    return KuCoinService.instance;
  }

  private trackApiCall(source: string, endpoint: string): void {
    const now = Date.now();
    this.apiCallTracker.push({ source, timestamp: now, endpoint });
    
    // Keep only last 10 minutes of calls
    this.apiCallTracker = this.apiCallTracker.filter(call => now - call.timestamp < 600000);
    
    console.log(`📊 API Call tracked: ${source} -> ${endpoint}`);
    console.log(`📊 Recent API calls (last 10min): ${this.apiCallTracker.length}`);
    
    // Log detailed breakdown
    const breakdown = this.apiCallTracker.reduce((acc, call) => {
      const key = `${call.source}-${call.endpoint}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 API call breakdown:', breakdown);
  }

  private async executePing(): Promise<boolean> {
    try {
      console.log('🏓 KuCoin API ping test...');
      this.trackApiCall('KuCoinService.ping', '/api/v1/timestamp');
      
      const response = await kucoinFetch('/api/v1/timestamp');
      
      if (response.code === '200000' && response.data) {
        console.log('✅ KuCoin API ping successful');
        // Cache the timestamp
        cacheService.set('timestamp', response.data, CACHE_TTL.TIMESTAMP);
        return true;
      }
      
      throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
    } catch (error) {
      console.error('❌ KuCoin API ping failed:', error);
      
      if (error instanceof RateLimitError || error instanceof ProxyError || error instanceof ApiError) {
        throw error;
      }
      
      throw new ProxyError('Network error during ping');
    }
  }

  async ping(): Promise<boolean> {
    // Check cache first
    const cachedTimestamp = cacheService.get<number>('timestamp');
    if (cachedTimestamp) {
      console.log('✅ KuCoin API ping (cached) - no API call made');
      return true;
    }

    // Use throttled ping
    return this.throttledPing();
  }

  async fetchPortfolio(): Promise<PortfolioSnapshot> {
    try {
      // Check cache first
      const cachedPortfolio = cacheService.get<PortfolioSnapshot>('portfolio');
      if (cachedPortfolio) {
        console.log('📊 Portfolio snapshot (cached) - no API call made');
        return cachedPortfolio;
      }

      console.log('📊 Fetching portfolio snapshot...');
      this.trackApiCall('KuCoinService.fetchPortfolio', '/api/v1/accounts');
      
      const response = await kucoinFetch('/api/v1/accounts');
      
      if (response.code === '200000' && Array.isArray(response.data)) {
        const accounts = response.data;
        const positions = [];
        let cashUSDT = 0;
        let totalValue = 0;

        for (const account of accounts) {
          const balance = parseFloat(account.balance);
          if (balance > 0) {
            let usdValue = 0;
            
            if (account.currency === 'USDT') {
              usdValue = balance;
              cashUSDT = balance;
            } else {
              // For other currencies, try to get current price using the cached getPrice function
              try {
                const price = await this.getCachedPrice(`${account.currency}-USDT`);
                usdValue = balance * price;
              } catch (priceError) {
                console.warn(`Could not get price for ${account.currency}:`, priceError);
                usdValue = 0;
              }
            }

            positions.push({
              currency: account.currency,
              balance,
              available: parseFloat(account.available),
              usdValue
            });

            totalValue += usdValue;
          }
        }

        const snapshot: PortfolioSnapshot = {
          positions,
          cashUSDT,
          totalValue,
          fetchedAt: Date.now()
        };

        // Cache the portfolio snapshot
        cacheService.set('portfolio', snapshot, CACHE_TTL.PORTFOLIO);

        console.log('✅ Portfolio snapshot created:', snapshot);
        return snapshot;
      }
      
      throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
    } catch (error) {
      console.error('❌ Portfolio fetch failed:', error);
      
      if (error instanceof RateLimitError || error instanceof ProxyError || error instanceof ApiError) {
        throw error;
      }
      
      throw new ProxyError('Failed to fetch portfolio');
    }
  }

  async getCachedPrice(symbol: string): Promise<number> {
    // Check cache first
    const cachedPrice = cacheService.get<number>('prices', symbol);
    if (cachedPrice) {
      console.log(`💰 Price for ${symbol} (cached): $${cachedPrice} - no API call made`);
      return cachedPrice;
    }

    // Fetch and cache
    console.log(`💰 Fetching price for ${symbol}...`);
    this.trackApiCall('KuCoinService.getCachedPrice', `/api/v1/market/orderbook/level1?symbol=${symbol}`);
    
    const price = await getPrice(symbol);
    cacheService.set('prices', price, CACHE_TTL.PRICE, symbol);
    
    return price;
  }

  // Method to invalidate all caches (for manual refresh)
  invalidateCache(): void {
    cacheService.invalidateAll();
    throttleManager.clear();
    this.apiCallTracker = [];
    console.log('🗑️ All KuCoin service caches invalidated');
  }

  // Get cache statistics
  getCacheStats(): Record<string, number> {
    const stats = cacheService.getStats();
    return {
      ...stats,
      apiCallsLast10Min: this.apiCallTracker.length
    };
  }

  // Get API call tracker for debugging
  getApiCallTracker(): { source: string; timestamp: number; endpoint: string }[] {
    return [...this.apiCallTracker];
  }
}

export const kucoinService = KuCoinService.getInstance();
