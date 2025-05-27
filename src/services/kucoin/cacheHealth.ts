
import { cacheService } from '../cacheService';

export interface CacheHealthInfo {
  isStale: boolean;
  age: number;
  staleness: number;
}

export class CacheHealthManager {
  getPortfolioCacheHealth(): CacheHealthInfo {
    const stats = cacheService.getStats();
    return {
      isStale: cacheService.isStale('portfolio'),
      age: stats.portfolioAge,
      staleness: stats.portfolioStaleness
    };
  }

  getCacheStats(): Record<string, number> {
    const baseStats = cacheService.getStats();
    const cacheHealth = this.getPortfolioCacheHealth();
    
    return {
      ...baseStats,
      cacheIsStale: cacheHealth.isStale ? 1 : 0,
      cacheStaleness: cacheHealth.staleness
    };
  }
}
