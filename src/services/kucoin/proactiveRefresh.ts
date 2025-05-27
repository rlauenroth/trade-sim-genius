
import { cacheService } from '../cacheService';

export class ProactiveRefreshManager {
  setupProactiveRefresh(
    portfolioFetcher: () => Promise<any>,
    pingExecutor: () => Promise<boolean>
  ): void {
    // Register portfolio proactive refresh
    cacheService.registerProactiveRefresh('portfolio', async () => {
      console.log('🔄 Proactive portfolio refresh triggered');
      try {
        await portfolioFetcher();
        console.log('✅ Proactive portfolio refresh completed');
      } catch (error) {
        console.error('❌ Proactive portfolio refresh failed:', error);
      }
    });

    // Register timestamp proactive refresh
    cacheService.registerProactiveRefresh('timestamp', async () => {
      console.log('🔄 Proactive timestamp refresh triggered');
      try {
        await pingExecutor();
        console.log('✅ Proactive timestamp refresh completed');
      } catch (error) {
        console.error('❌ Proactive timestamp refresh failed:', error);
      }
    });
  }
}
