
import { useState, useEffect } from 'react';
import { networkStatusService } from '@/services/networkStatusService';

interface NetworkStatusHook {
  status: 'connected' | 'disconnected';
  lastSuccess: number;
  consecutiveFailures: number;
  isProxyReachable: boolean;
  rateLimitActive: boolean;
}

export const useNetworkStatus = (): NetworkStatusHook => {
  const [networkStatus, setNetworkStatus] = useState(() => {
    const status = networkStatusService.getStatus();
    return {
      status: status.isProxyReachable ? 'connected' as const : 'disconnected' as const,
      lastSuccess: status.lastSuccessfulCall,
      consecutiveFailures: status.totalErrorCalls,
      isProxyReachable: status.isProxyReachable,
      rateLimitActive: status.rateLimitActive
    };
  });

  useEffect(() => {
    const unsubscribe = networkStatusService.subscribe((status) => {
      setNetworkStatus({
        status: status.isProxyReachable ? 'connected' : 'disconnected',
        lastSuccess: status.lastSuccessfulCall,
        consecutiveFailures: status.totalErrorCalls,
        isProxyReachable: status.isProxyReachable,
        rateLimitActive: status.rateLimitActive
      });
    });

    return unsubscribe;
  }, []);

  return networkStatus;
};
