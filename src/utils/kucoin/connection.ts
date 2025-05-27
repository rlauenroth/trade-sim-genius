
import { KUCOIN_PROXY_BASE } from '@/config';
import { networkStatusService } from '@/services/networkStatusService';
import { ActivityLogger } from './types';

// Global activity logger access
let globalActivityLogger: ActivityLogger | null = null;

export function setConnectionActivityLogger(logger: ActivityLogger | null) {
  globalActivityLogger = logger;
}

// Proxy connection test with correct path
export async function testProxyConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing KuCoin proxy connection...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(`${KUCOIN_PROXY_BASE}/api/v1/status`, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // 404 is expected from KuCoin for this endpoint, means proxy is working
    const isConnected = response.status === 404 || response.status === 200;
    
    if (isConnected) {
      console.log('✅ KuCoin proxy connection successful');
      globalActivityLogger?.addProxyStatusLog(true);
      networkStatusService.recordSuccessfulCall('/api/v1/status');
      networkStatusService.setInitialProxyStatus(true);
    } else {
      console.log('❌ KuCoin proxy connection failed');
      globalActivityLogger?.addProxyStatusLog(false);
      networkStatusService.setInitialProxyStatus(false);
    }
    
    return isConnected;
  } catch (error) {
    console.error('❌ Proxy connection test failed:', error);
    globalActivityLogger?.addProxyStatusLog(false);
    networkStatusService.setInitialProxyStatus(false);
    return false;
  }
}
