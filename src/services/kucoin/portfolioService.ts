
import { PortfolioSnapshot } from '@/types/simReadiness';
import { getAccountBalances } from '@/utils/kucoin/accountData';
import { getPrice } from '@/utils/kucoinProxyApi';
import { cacheService } from '../cacheService';
import { ApiCallTracker } from './apiCallTracker';
import { loggingService } from '../loggingService';
import { networkStatusService } from '../networkStatusService';

interface ApiKeys {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export class PortfolioService {
  private apiCallTracker: ApiCallTracker;
  
  constructor(apiCallTracker: ApiCallTracker) {
    this.apiCallTracker = apiCallTracker;
  }
  
  async fetchPortfolio(apiKeys: ApiKeys | null): Promise<PortfolioSnapshot> {
    if (!apiKeys) {
      return {
        totalValue: 0,
        positions: [],
        cashUSDT: 0,
        fetchedAt: Date.now()
      };
    }

    try {
      // Convert to KuCoin credentials format
      const credentials = {
        kucoinApiKey: apiKeys.apiKey,
        kucoinApiSecret: apiKeys.secret,
        kucoinApiPassphrase: apiKeys.passphrase
      };
      
      // Get account balances - no credentials needed as it uses centralized store
      const balances = await getAccountBalances();
      
      // Track API call
      this.apiCallTracker.trackApiCall('PortfolioService', 'accounts');
      
      // Process balances to calculate USD values
      const positions = [];
      let totalValue = 0;
      let cashUSDT = 0;
      
      for (const balance of balances) {
        if (parseFloat(balance.balance) <= 0) continue;
        
        try {
          let usdValue = 0;
          
          if (balance.currency === 'USDT') {
            usdValue = parseFloat(balance.balance);
            cashUSDT = usdValue;
          } else {
            const symbol = `${balance.currency}-USDT`;
            const price = await this.getCachedPrice(symbol);
            if (price) {
              usdValue = parseFloat(balance.balance) * price;
              // Track the price lookup
              this.apiCallTracker.trackApiCall('PortfolioService', `price-${symbol}`);
            }
          }
          
          positions.push({
            currency: balance.currency,
            balance: parseFloat(balance.balance),
            available: parseFloat(balance.available),
            usdValue: usdValue
          });
          
          totalValue += usdValue;
        } catch (assetError) {
          console.error(`Error calculating USD value for ${balance.currency}:`, assetError);
          loggingService.logError(`Portfolio asset valuation failed for ${balance.currency}`, {
            error: assetError instanceof Error ? assetError.message : 'unknown',
            balance: balance.balance
          });
        }
      }
      
      // Record successful call
      networkStatusService.recordSuccessfulCall('/accounts');
      
      return {
        totalValue,
        positions,
        cashUSDT,
        fetchedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      loggingService.logError('Portfolio fetch failed', {
        error: error instanceof Error ? error.message : 'unknown'
      });
      networkStatusService.recordError(error as Error, '/accounts');
      
      return {
        totalValue: 0,
        positions: [],
        cashUSDT: 0,
        fetchedAt: Date.now()
      };
    }
  }
  
  async getCachedPrice(symbol: string): Promise<number> {
    const cacheKey = `price_${symbol}`;
    
    // Try to get from cache first
    const cachedPrice = cacheService.get<number>(cacheKey);
    if (cachedPrice !== undefined) {
      return cachedPrice;
    }
    
    try {
      // Fetch fresh price
      const price = await getPrice(symbol);
      
      // Cache the result for 10 seconds
      cacheService.set(cacheKey, price, 10000);
      
      return price;
    } catch (error) {
      console.error(`Price fetch failed for ${symbol}:`, error);
      networkStatusService.recordError(error as Error, `/market/orderbook/level1?symbol=${symbol}`);
      throw error;
    }
  }
}
