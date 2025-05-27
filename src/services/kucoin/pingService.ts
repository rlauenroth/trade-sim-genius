
import { kucoinFetch } from '@/utils/kucoinProxyApi';
import { cacheService, CACHE_TTL } from '../cacheService';
import { throttleManager } from '@/utils/throttle';
import { ApiError, RateLimitError, ProxyError } from '@/utils/errors';
import { ApiCallTracker } from './apiCallTracker';

export class PingService {
  private throttledPing: ReturnType<typeof throttleManager.throttle>;
  private apiCallTracker: ApiCallTracker;

  constructor(apiCallTracker: ApiCallTracker) {
    this.apiCallTracker = apiCallTracker;
    
    // Create throttled ping function (max 1 call per 10 seconds)
    this.throttledPing = throttleManager.throttle(
      'kucoin-ping',
      this.executePing.bind(this),
      CACHE_TTL.TIMESTAMP
    );
  }

  private async executePing(): Promise<boolean> {
    try {
      console.log('🏓 KuCoin API ping test...');
      this.apiCallTracker.trackApiCall('KuCoinService.ping', '/api/v1/timestamp');
      
      const response = await kucoinFetch('/api/v1/timestamp');
      
      if (response.code === '200000' && response.data) {
        console.log('✅ KuCoin API ping successful');
        // Cache the timestamp with updated TTL
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
}
