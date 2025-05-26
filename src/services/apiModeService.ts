
// Centralized API mode management service
interface ApiModeStatus {
  kucoinMode: 'live' | 'mock' | 'hybrid';
  openRouterMode: 'live' | 'demo';
  corsIssuesDetected: boolean;
  lastChecked: number;
}

class ApiModeService {
  private static instance: ApiModeService;
  private status: ApiModeStatus = {
    kucoinMode: 'hybrid',
    openRouterMode: 'demo',
    corsIssuesDetected: false,
    lastChecked: 0
  };

  static getInstance(): ApiModeService {
    if (!ApiModeService.instance) {
      ApiModeService.instance = new ApiModeService();
    }
    return ApiModeService.instance;
  }

  async detectCorsSupport(): Promise<boolean> {
    try {
      console.log('🔍 Testing CORS support for KuCoin API...');
      const response = await fetch('https://api.kucoin.com/api/v1/timestamp', {
        method: 'GET',
        mode: 'cors'
      });
      
      const corsSupported = response.ok;
      this.status.corsIssuesDetected = !corsSupported;
      this.status.lastChecked = Date.now();
      
      console.log(`CORS support detected: ${corsSupported}`);
      return corsSupported;
    } catch (error) {
      console.log('CORS not supported, falling back to mock mode');
      this.status.corsIssuesDetected = true;
      this.status.lastChecked = Date.now();
      return false;
    }
  }

  async initializeApiModes(): Promise<void> {
    const corsSupported = await this.detectCorsSupport();
    
    if (corsSupported) {
      this.status.kucoinMode = 'hybrid'; // Live for public, mock for private
      console.log('✅ KuCoin API: Hybrid mode enabled (live public endpoints)');
    } else {
      this.status.kucoinMode = 'mock';
      console.log('⚠️ KuCoin API: Mock mode (CORS limitations)');
    }

    // OpenRouter typically supports CORS
    this.status.openRouterMode = 'live';
    console.log('✅ OpenRouter API: Live mode enabled');
  }

  getApiModeStatus(): ApiModeStatus {
    return { ...this.status };
  }

  setKucoinMode(mode: 'live' | 'mock' | 'hybrid'): void {
    this.status.kucoinMode = mode;
  }

  setOpenRouterMode(mode: 'live' | 'demo'): void {
    this.status.openRouterMode = mode;
  }
}

export const apiModeService = ApiModeService.getInstance();
