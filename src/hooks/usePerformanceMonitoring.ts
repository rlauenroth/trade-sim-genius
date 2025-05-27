import { useCallback, useRef } from 'react';
import { loggingService } from '@/services/loggingService';

interface PerformanceMetrics {
  apiResponseTimes: number[];
  averageResponseTime: number;
  slowRequests: number;
  totalRequests: number;
  simulationCycleTime: number;
  portfolioGrowthPercent: number;
  successRate: number;
}

export const usePerformanceMonitoring = () => {
  const performanceData = useRef<{
    apiCalls: Array<{ timestamp: number; duration: number; endpoint: string; success: boolean }>;
    simulationCycles: Array<{ timestamp: number; duration: number; portfolioChange: number }>;
  }>({
    apiCalls: [],
    simulationCycles: []
  });

  const trackApiCall = useCallback((
    endpoint: string,
    startTime: number,
    endTime: number,
    success: boolean
  ) => {
    const duration = endTime - startTime;
    
    performanceData.current.apiCalls.push({
      timestamp: endTime,
      duration,
      endpoint,
      success
    });

    // Keep only last 100 API calls
    if (performanceData.current.apiCalls.length > 100) {
      performanceData.current.apiCalls = performanceData.current.apiCalls.slice(-100);
    }

    // Log slow requests (> 200ms as per concept)
    if (duration > 200) {
      loggingService.logEvent('PERFORMANCE', 'Slow API request detected', {
        endpoint,
        duration,
        threshold: 200
      });
    }

    // Log very slow requests (> 1000ms)
    if (duration > 1000) {
      loggingService.logEvent('PERFORMANCE', 'Very slow API request', {
        endpoint,
        duration,
        severity: 'WARNING'
      });
    }
  }, []);

  const trackSimulationCycle = useCallback((
    startTime: number,
    endTime: number,
    portfolioValueBefore: number,
    portfolioValueAfter: number
  ) => {
    const duration = endTime - startTime;
    const portfolioChange = ((portfolioValueAfter - portfolioValueBefore) / portfolioValueBefore) * 100;
    
    performanceData.current.simulationCycles.push({
      timestamp: endTime,
      duration,
      portfolioChange
    });

    // Keep only last 50 simulation cycles
    if (performanceData.current.simulationCycles.length > 50) {
      performanceData.current.simulationCycles = performanceData.current.simulationCycles.slice(-50);
    }

    loggingService.logEvent('PERFORMANCE', 'Simulation cycle completed', {
      duration,
      portfolioChange,
      portfolioValueBefore,
      portfolioValueAfter,
      targetGrowth: 1.0 // 1% target per cycle as per concept
    });

    // Check if we're meeting the 1% growth target
    if (portfolioChange >= 1.0) {
      loggingService.logSuccess('Performance target achieved', {
        portfolioChange,
        target: 1.0,
        exceeded: portfolioChange - 1.0
      });
    } else if (portfolioChange < 0) {
      loggingService.logEvent('PERFORMANCE', 'Negative cycle performance', {
        portfolioChange,
        severity: 'WARNING'
      });
    }
  }, []);

  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    const now = Date.now();
    const recentApiCalls = performanceData.current.apiCalls.filter(
      call => now - call.timestamp < 10 * 60 * 1000 // Last 10 minutes
    );

    const responseTimes = recentApiCalls.map(call => call.duration);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const slowRequests = recentApiCalls.filter(call => call.duration > 200).length;
    const successfulCalls = recentApiCalls.filter(call => call.success).length;
    const successRate = recentApiCalls.length > 0 
      ? (successfulCalls / recentApiCalls.length) * 100 
      : 100;

    const recentCycles = performanceData.current.simulationCycles.filter(
      cycle => now - cycle.timestamp < 60 * 60 * 1000 // Last hour
    );

    const averageCycleTime = recentCycles.length > 0
      ? recentCycles.reduce((sum, cycle) => sum + cycle.duration, 0) / recentCycles.length
      : 0;

    const totalPortfolioGrowth = recentCycles.reduce((sum, cycle) => sum + cycle.portfolioChange, 0);
    const averagePortfolioGrowth = recentCycles.length > 0 ? totalPortfolioGrowth / recentCycles.length : 0;

    return {
      apiResponseTimes: responseTimes,
      averageResponseTime,
      slowRequests,
      totalRequests: recentApiCalls.length,
      simulationCycleTime: averageCycleTime,
      portfolioGrowthPercent: averagePortfolioGrowth,
      successRate
    };
  }, []);

  const logPerformanceReport = useCallback(() => {
    const metrics = getPerformanceMetrics();
    
    loggingService.logEvent('PERFORMANCE', 'Performance report', {
      metrics,
      timestamp: Date.now(),
      reportType: 'periodic'
    });

    // Check for performance issues
    if (metrics.averageResponseTime > 200) {
      loggingService.logEvent('PERFORMANCE', 'Average response time exceeds target', {
        current: metrics.averageResponseTime,
        target: 200,
        severity: 'WARNING'
      });
    }

    if (metrics.successRate < 95) {
      loggingService.logEvent('PERFORMANCE', 'Success rate below target', {
        current: metrics.successRate,
        target: 95,
        severity: 'WARNING'
      });
    }

    return metrics;
  }, [getPerformanceMetrics]);

  const clearPerformanceData = useCallback(() => {
    performanceData.current = {
      apiCalls: [],
      simulationCycles: []
    };
    
    loggingService.logEvent('PERFORMANCE', 'Performance data cleared');
  }, []);

  return {
    trackApiCall,
    trackSimulationCycle,
    getPerformanceMetrics,
    logPerformanceReport,
    clearPerformanceData
  };
};
