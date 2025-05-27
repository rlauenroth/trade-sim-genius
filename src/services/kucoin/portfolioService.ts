
import { kucoinFetch } from '@/utils/kucoinProxyApi';
import { PortfolioSnapshot } from '@/types/simReadiness';
import { ApiError, RateLimitError, ProxyError } from '@/utils/errors';
import { cacheService, CACHE_TTL } from '../cacheService';
import { ApiCallTracker } from './apiCallTracker';

export class PortfolioService {
  private apiCallTracker: ApiCallTracker;

  constructor(apiCallTracker: ApiCallTracker) {
    this.apiCallTracker = apiCallTracker;
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
    this.apiCallTracker.trackApiCall('KuCoinService.getCachedPrice', `/api/v1/market/orderbook/level1?symbol=${symbol}`);
    
    const { getPrice } = await import('@/utils/kucoinProxyApi');
    const price = await getPrice(symbol);
    cacheService.set('prices', price, CACHE_TTL.PRICE, symbol);
    
    return price;
  }

  async fetchPortfolio(): Promise<PortfolioSnapshot> {
    try {
      // Check cache first with staleness detection
      const cachedPortfolio = cacheService.get<PortfolioSnapshot>('portfolio');
      if (cachedPortfolio) {
        const isStale = cacheService.isStale('portfolio');
        console.log(`📊 Portfolio snapshot (cached) - no API call made${isStale ? ' [STALE]' : ' [FRESH]'}`);
        return cachedPortfolio;
      }

      console.log('📊 Fetching portfolio snapshot...');
      this.apiCallTracker.trackApiCall('KuCoinService.fetchPortfolio', '/api/v1/accounts');
      
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

        // Cache the portfolio snapshot with updated TTL
        cacheService.set('portfolio', snapshot, CACHE_TTL.PORTFOLIO);

        console.log('✅ Portfolio snapshot created and cached:', snapshot);
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
}
