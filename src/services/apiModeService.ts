
// Centralized API mode management service - NO MOCK FALLBACKS
import { KUCOIN_PROXY_BASE } from '@/config';

interface ApiModeStatus {
  kucoinMode: 'live' | 'error';
  openRouterMode: 'live' | 'demo';
  corsIssuesDetected: boolean;
  lastChecked: number;
}

class ApiModeService {
  private static instance: ApiModeService;
  private status: ApiModeStatus = {
    kucoinMode: 'live',
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
      console.log('🔍 Testing proxy connection for KuCoin API...');
      const response = await fetch(`${KUCOIN_PROXY_BASE}/api/v1/timestamp`, {
        method: 'GET'
      });
      
      const proxySupported = response.ok || response.status === 401; // 401 is expected without API keys
      this.status.corsIssuesDetected = !proxySupported;
      this.status.lastChecked = Date.now();
      
      console.log(`Proxy connection detected: ${proxySupported}`);
      return proxySupported;
    } catch (error) {
      console.log('Proxy not accessible');
      this.status.corsIssuesDetected = true;
      this.status.lastChecked = Date.now();
      return false;
    }
  }

  async initializeApiModes(): Promise<void> {
    const proxySupported = await this.detectCorsSupport();
    
    if (proxySupported) {
      this.status.kucoinMode = 'live';
      console.log('✅ KuCoin API: Live mode enabled (via proxy)');
    } else {
      this.status.kucoinMode = 'error';
      console.log('❌ KuCoin API: Error mode (proxy not accessible)');
    }

    // OpenRouter typically supports CORS
    this.status.openRouterMode = 'live';
    console.log('✅ OpenRouter API: Live mode enabled');
  }

  getApiModeStatus(): ApiModeStatus {
    return { ...this.status };
  }

  setKucoinMode(mode: 'live' | 'error'): void {
    this.status.kucoinMode = mode;
  }

  setOpenRouterMode(mode: 'live' | 'demo'): void {
    this.status.openRouterMode = mode;
  }
}

export const apiModeService = ApiModeService.getInstance();
