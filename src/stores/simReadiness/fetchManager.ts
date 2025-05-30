
import { kucoinService } from '@/services/kucoinService';
import { useCentralPortfolioStore } from '@/stores/centralPortfolioStore';

export class FetchManager {
  private fetchInProgress: boolean = false;
  private static globalFetchLock: boolean = false;

  constructor(
    private onFetchSuccess: (portfolio: any) => void,
    private onFetchFail: (reason: string) => void
  ) {}

  async fetchPortfolioData(): Promise<void> {
    // Global fetch lock to prevent concurrent fetches from any source
    if (this.fetchInProgress || FetchManager.globalFetchLock) {
      console.log('⚠️ Fetch already in progress globally, skipping...');
      return;
    }
    
    this.fetchInProgress = true;
    FetchManager.globalFetchLock = true;
    console.log('🔄 Starting fetchPortfolioData...');
    
    try {
      useCentralPortfolioStore.getState().setLoading(true);
      
      const portfolio = await kucoinService.fetchPortfolio();
      
      console.log('✅ Portfolio data fetched:', {
        totalValue: portfolio.totalValue,
        positionCount: portfolio.positions.length
      });
      
      this.onFetchSuccess(portfolio);
      
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Portfolio fetch failed:', reason);
      this.onFetchFail(reason);
    } finally {
      this.fetchInProgress = false;
      FetchManager.globalFetchLock = false;
    }
  }

  canFetch(): boolean {
    return !this.fetchInProgress && !FetchManager.globalFetchLock;
  }

  static resetGlobalLock(): void {
    FetchManager.globalFetchLock = false;
  }
}
