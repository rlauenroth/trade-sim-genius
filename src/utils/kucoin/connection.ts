
import { KUCOIN_PROXY_BASE } from '@/config';
import { networkStatusService } from '@/services/networkStatusService';
import { ActivityLogger } from './types';
import { useSettingsV2Store } from '@/stores/settingsV2';

// Global activity logger access
let globalActivityLogger: ActivityLogger | null = null;

export function setConnectionActivityLogger(logger: ActivityLogger | null) {
  globalActivityLogger = logger;
}

// Helper function to get the configured proxy URL
function getProxyBaseUrl(): string {
  try {
    const { settings } = useSettingsV2Store.getState();
    const configuredProxy = settings.proxyUrl;
    
    // Use configured proxy URL if available, otherwise fallback to default
    const actualProxy = configuredProxy || KUCOIN_PROXY_BASE;
    
    console.log('🔗 Connection test using proxy URL:', actualProxy, configuredProxy ? '(configured)' : '(default)');
    return actualProxy;
  } catch (error) {
    console.warn('⚠️ Could not get proxy URL from settings for connection test, using default:', error);
    return KUCOIN_PROXY_BASE;
  }
}

// Proxy connection test with dynamic proxy URL
export async function testProxyConnection(customProxyUrl?: string): Promise<boolean> {
  try {
    // Use custom URL if provided, otherwise get from settings
    const proxyBaseUrl = customProxyUrl || getProxyBaseUrl();
    
    console.log('🔍 Testing KuCoin proxy connection to:', proxyBaseUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(`${proxyBaseUrl}/api/v1/status`, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // 404 is expected from KuCoin for this endpoint, means proxy is working
    const isConnected = response.status === 404 || response.status === 200;
    
    if (isConnected) {
      console.log('✅ KuCoin proxy connection successful to:', proxyBaseUrl);
      globalActivityLogger?.addProxyStatusLog(true);
      networkStatusService.recordSuccessfulCall('/api/v1/status');
      networkStatusService.setInitialProxyStatus(true);
    } else {
      console.log('❌ KuCoin proxy connection failed to:', proxyBaseUrl, 'Status:', response.status);
      globalActivityLogger?.addProxyStatusLog(false);
      networkStatusService.setInitialProxyStatus(false);
    }
    
    return isConnected;
  } catch (error) {
    const proxyUrl = customProxyUrl || getProxyBaseUrl();
    console.error('❌ Proxy connection test failed for:', proxyUrl, error);
    globalActivityLogger?.addProxyStatusLog(false);
    networkStatusService.setInitialProxyStatus(false);
    return false;
  }
}
