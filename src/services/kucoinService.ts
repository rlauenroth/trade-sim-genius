
import { kucoinFetch } from '@/utils/kucoinProxyApi';
import { PortfolioSnapshot } from '@/types/simReadiness';
import { ApiError, RateLimitError, ProxyError } from '@/utils/errors';

export class KuCoinService {
  private static instance: KuCoinService;

  static getInstance(): KuCoinService {
    if (!KuCoinService.instance) {
      KuCoinService.instance = new KuCoinService();
    }
    return KuCoinService.instance;
  }

  async ping(): Promise<boolean> {
    try {
      console.log('🏓 KuCoin API ping test...');
      const response = await kucoinFetch('/api/v1/timestamp');
      
      if (response.code === '200000' && response.data) {
        console.log('✅ KuCoin API ping successful');
        return true;
      }
      
      throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
    } catch (error) {
      console.error('❌ KuCoin API ping failed:', error);
      
      if (error instanceof RateLimitError || error instanceof ProxyError || error instanceof ApiError) {
        throw error;
      }
      
      // Network or unknown errors
      throw new ProxyError('Network error during ping');
    }
  }

  async fetchPortfolio(): Promise<PortfolioSnapshot> {
    try {
      console.log('📊 Fetching portfolio snapshot...');
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
              // For other currencies, try to get current price
              try {
                const priceResponse = await kucoinFetch('/api/v1/market/ticker', 'GET', { 
                  symbol: `${account.currency}-USDT` 
                });
                if (priceResponse.code === '200000' && priceResponse.data?.price) {
                  usdValue = balance * parseFloat(priceResponse.data.price);
                }
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

        // Ensure minimum portfolio value for simulation
        if (totalValue < 1000) {
          totalValue = 10000;
          cashUSDT = 10000;
        }

        const snapshot: PortfolioSnapshot = {
          positions,
          cashUSDT,
          totalValue,
          fetchedAt: Date.now()
        };

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
}

export const kucoinService = KuCoinService.getInstance();
