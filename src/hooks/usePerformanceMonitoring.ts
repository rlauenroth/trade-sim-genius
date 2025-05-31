
import { useState, useCallback, useRef } from 'react';
import { loggingService } from '@/services/loggingService';

interface PerformanceMetrics {
  cycleCount: number;
  averageCycleTime: number;
  totalExecutionTime: number;
  successfulTrades: number;
  failedTrades: number;
  portfolioGrowth: number;
  lastCycleTime: number;
  healthScore: number;
  // FIXED: Add missing performance metrics for UI
  averageResponseTime: number;
  portfolioGrowthPercent: number;
  successRate: number;
  totalRequests: number;
  slowRequests: number;
}

export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cycleCount: 0,
    averageCycleTime: 0,
    totalExecutionTime: 0,
    successfulTrades: 0,
    failedTrades: 0,
    portfolioGrowth: 0,
    lastCycleTime: 0,
    healthScore: 100,
    // FIXED: Initialize missing metrics
    averageResponseTime: 0,
    portfolioGrowthPercent: 0,
    successRate: 100,
    totalRequests: 0,
    slowRequests: 0
  });

  const cycleStartTimes = useRef<number[]>([]);
  const initialPortfolioValue = useRef<number | null>(null);

  const trackSimulationCycle = useCallback((
    startTime: number,
    endTime: number,
    portfolioValueBefore: number,
    portfolioValueAfter: number
  ) => {
    const cycleTime = endTime - startTime;
    
    setMetrics(prev => {
      const newCycleCount = prev.cycleCount + 1;
      const newTotalExecutionTime = prev.totalExecutionTime + cycleTime;
      const newAverageCycleTime = newTotalExecutionTime / newCycleCount;
      
      // Track portfolio growth
      if (initialPortfolioValue.current === null) {
        initialPortfolioValue.current = portfolioValueBefore;
      }
      
      const growth = initialPortfolioValue.current > 0 
        ? ((portfolioValueAfter - initialPortfolioValue.current) / initialPortfolioValue.current) * 100 
        : 0;

      // Calculate health score based on performance metrics
      const avgCycleTimeScore = Math.max(0, 100 - (newAverageCycleTime / 1000) * 10); // Penalize slow cycles
      const successRateScore = newCycleCount > 0 ? (prev.successfulTrades / newCycleCount) * 100 : 100;
      const growthScore = Math.min(100, Math.max(0, 50 + growth * 2)); // Neutral at 0% growth
      
      const healthScore = (avgCycleTimeScore + successRateScore + growthScore) / 3;
      
      const newTotalRequests = prev.totalRequests + 1;
      const newSlowRequests = cycleTime > 200 ? prev.slowRequests + 1 : prev.slowRequests;

      const updatedMetrics = {
        cycleCount: newCycleCount,
        averageCycleTime: newAverageCycleTime,
        totalExecutionTime: newTotalExecutionTime,
        successfulTrades: prev.successfulTrades,
        failedTrades: prev.failedTrades,
        portfolioGrowth: growth,
        lastCycleTime: cycleTime,
        healthScore,
        // FIXED: Update additional metrics
        averageResponseTime: newAverageCycleTime,
        portfolioGrowthPercent: growth,
        successRate: newTotalRequests > 0 ? (prev.successfulTrades / newTotalRequests) * 100 : 100,
        totalRequests: newTotalRequests,
        slowRequests: newSlowRequests
      };

      // Log performance data every 10 cycles
      if (newCycleCount % 10 === 0) {
        loggingService.logEvent('SYSTEM', 'Cycle metrics report', updatedMetrics);
      }

      return updatedMetrics;
    });
  }, []);

  const trackTradeExecution = useCallback((success: boolean, executionTime: number) => {
    setMetrics(prev => ({
      ...prev,
      successfulTrades: success ? prev.successfulTrades + 1 : prev.successfulTrades,
      failedTrades: success ? prev.failedTrades : prev.failedTrades + 1
    }));

    loggingService.logEvent('SYSTEM', 'Trade execution tracked', {
      success,
      executionTime,
      timestamp: Date.now()
    });
  }, []);

  // FIXED: Add the missing getPerformanceMetrics method
  const getPerformanceMetrics = useCallback(() => {
    return metrics;
  }, [metrics]);

  const logPerformanceReport = useCallback(() => {
    const report = {
      ...metrics,
      timestamp: Date.now(),
      uptime: Date.now() - (cycleStartTimes.current[0] || Date.now())
    };

    loggingService.logEvent('SYSTEM', 'Full performance report', report);
    console.log('📊 Performance Report:', report);

    return report;
  }, [metrics]);

  const resetMetrics = useCallback(() => {
    setMetrics({
      cycleCount: 0,
      averageCycleTime: 0,
      totalExecutionTime: 0,
      successfulTrades: 0,
      failedTrades: 0,
      portfolioGrowth: 0,
      lastCycleTime: 0,
      healthScore: 100,
      // FIXED: Reset additional metrics
      averageResponseTime: 0,
      portfolioGrowthPercent: 0,
      successRate: 100,
      totalRequests: 0,
      slowRequests: 0
    });
    initialPortfolioValue.current = null;
    cycleStartTimes.current = [];
    
    loggingService.logEvent('SYSTEM', 'Metrics reset');
  }, []);

  return {
    metrics,
    trackSimulationCycle,
    trackTradeExecution,
    getPerformanceMetrics, // FIXED: Export the missing method
    logPerformanceReport,
    resetMetrics
  };
};
