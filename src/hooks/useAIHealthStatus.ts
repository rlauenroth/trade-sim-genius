
import { useState, useEffect, useCallback } from 'react';
import { candidateErrorManager, GlobalAIHealthMetrics } from '@/services/aiErrorHandling/candidateErrorManager';

export interface AIHealthStatus {
  successRate: number;
  status: 'healthy' | 'degraded' | 'critical';
  activeBlacklists: number;
  totalErrors: number;
  fallbacksUsed: number;
  lastUpdate: number;
}

export const useAIHealthStatus = () => {
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus>({
    successRate: 1,
    status: 'healthy',
    activeBlacklists: 0,
    totalErrors: 0,
    fallbacksUsed: 0,
    lastUpdate: Date.now()
  });

  const updateHealthStatus = useCallback(() => {
    const metrics = candidateErrorManager.getHealthMetrics();
    const successRate = candidateErrorManager.getSuccessRate();
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (successRate < 0.6) {
      status = 'critical';
    } else if (successRate < 0.8 || metrics.currentBlacklists > 5) {
      status = 'degraded';
    }

    setHealthStatus({
      successRate,
      status,
      activeBlacklists: metrics.currentBlacklists,
      totalErrors: metrics.totalErrors,
      fallbacksUsed: metrics.fallbacksUsed,
      lastUpdate: Date.now()
    });
  }, []);

  const clearBlacklist = useCallback((symbol: string) => {
    candidateErrorManager.clearBlacklist(symbol);
    updateHealthStatus();
  }, [updateHealthStatus]);

  const getBlacklistedSymbols = useCallback(() => {
    return candidateErrorManager.getBlacklistedSymbols();
  }, []);

  const getDetailedMetrics = useCallback((): GlobalAIHealthMetrics => {
    return candidateErrorManager.getHealthMetrics();
  }, []);

  useEffect(() => {
    updateHealthStatus();
    const interval = setInterval(updateHealthStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [updateHealthStatus]);

  return {
    healthStatus,
    clearBlacklist,
    getBlacklistedSymbols,
    getDetailedMetrics,
    updateHealthStatus
  };
};
