
import { useState, useEffect, useCallback } from 'react';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { SimReadinessStatus } from '@/types/simReadiness';
import { loggingService } from '@/services/loggingService';

interface DebugInfo {
  detailedStatus: Record<string, any>;
  stateHistory: Array<{
    timestamp: number;
    state: string;
    reason?: string;
  }>;
  cacheStats: Record<string, number>;
  apiCallStats: Record<string, number>;
}

export const usePortfolioDebugger = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    detailedStatus: {},
    stateHistory: [],
    cacheStats: {},
    apiCallStats: {}
  });
  
  const [status, setStatus] = useState<SimReadinessStatus>(simReadinessStore.getStatus());

  useEffect(() => {
    const unsubscribe = simReadinessStore.subscribe((newStatus) => {
      setStatus(newStatus);
      
      // Track state changes
      setDebugInfo(prev => ({
        ...prev,
        stateHistory: [
          ...prev.stateHistory.slice(-9), // Keep last 10 states
          {
            timestamp: Date.now(),
            state: newStatus.state,
            reason: newStatus.reason || undefined
          }
        ]
      }));
      
      console.log('🔍 Portfolio state change:', {
        from: prev.stateHistory[prev.stateHistory.length - 1]?.state,
        to: newStatus.state,
        reason: newStatus.reason
      });
    });
    
    return unsubscribe;
  }, []);

  const refreshDebugInfo = useCallback(() => {
    try {
      const detailedStatus = simReadinessStore.getDetailedStatus();
      const cacheStats = simReadinessStore.getCacheStats();
      
      setDebugInfo(prev => ({
        ...prev,
        detailedStatus,
        cacheStats
      }));
      
      console.log('🔍 Debug info refreshed:', {
        detailedStatus,
        cacheStats
      });
      
      loggingService.logEvent('SYSTEM', 'Portfolio debug info collected', {
        state: status.state,
        cacheStats,
        timers: detailedStatus.timers
      });
      
    } catch (error) {
      console.error('Failed to refresh debug info:', error);
    }
  }, [status.state]);

  const exportDebugLogs = useCallback(() => {
    const logs = loggingService.getLogs();
    const portfolioLogs = logs.filter(log => 
      log.type === 'SIM' || 
      log.type === 'PORTFOLIO_UPDATE' || 
      log.message.toLowerCase().includes('portfolio')
    );
    
    const debugData = {
      timestamp: new Date().toISOString(),
      status,
      debugInfo,
      portfolioLogs: portfolioLogs.slice(-50) // Last 50 relevant logs
    };
    
    const blob = new Blob([JSON.stringify(debugData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-debug-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    console.log('📁 Debug logs exported');
  }, [status, debugInfo]);

  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refresh triggered from debugger');
    simReadinessStore.forceRefresh();
  }, []);

  const isStuckInFetching = status.state === 'FETCHING' && 
    debugInfo.stateHistory.filter(h => h.state === 'FETCHING').length > 3;

  const hasRecentErrors = debugInfo.stateHistory
    .filter(h => h.timestamp > Date.now() - 60000) // Last minute
    .some(h => h.state === 'UNSTABLE');

  return {
    status,
    debugInfo,
    refreshDebugInfo,
    exportDebugLogs,
    forceRefresh,
    isStuckInFetching,
    hasRecentErrors,
    canDebug: true
  };
};
