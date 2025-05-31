
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDashboardState } from '@/hooks/useDashboardState';

// Mock all dependencies
vi.mock('@/stores/settingsV2');
vi.mock('@/hooks/useSimulation');
vi.mock('@/hooks/usePortfolioData');
vi.mock('@/hooks/useTradingDashboardData');
vi.mock('@/hooks/useCentralPortfolioService');
vi.mock('@/hooks/useCandidates');

const mockSettingsV2Store = {
  settings: {
    kucoin: { key: 'test-key', secret: 'test-secret', passphrase: 'test-pass' },
    openRouter: { apiKey: 'test-openrouter-key' },
    tradingMode: 'simulation',
    tradingStrategy: 'balanced',
    riskLimits: { maxOpenOrders: 5, maxExposure: 1000 },
    proxyUrl: 'https://test.proxy.com',
    model: { id: 'test-model' }
  },
  isLoading: false
};

const mockPortfolioData = {
  portfolioData: { totalValue: 1000, positions: [] },
  isLoading: false,
  error: null,
  loadPortfolioData: vi.fn(),
  loadPortfolioDataWithCredentials: vi.fn(),
  retryLoadPortfolioData: vi.fn()
};

const mockCentralPortfolio = {
  snapshot: { totalValue: 1000, positions: [] },
  isLoading: false,
  error: null,
  refresh: vi.fn()
};

const mockSimulation = {
  simulationState: null,
  isSimulationActive: false,
  startSimulation: vi.fn(),
  stopSimulation: vi.fn(),
  pauseSimulation: vi.fn(),
  resumeSimulation: vi.fn(),
  acceptSignal: vi.fn(),
  ignoreSignal: vi.fn(),
  currentSignal: null,
  availableSignals: [],
  autoModeError: null,
  portfolioHealthStatus: 'healthy',
  logPerformanceReport: vi.fn(),
  activityLog: []
};

const mockCandidates = {
  candidates: [],
  updateCandidates: vi.fn(),
  updateCandidateStatus: vi.fn(),
  addCandidate: vi.fn(),
  clearCandidates: vi.fn(),
  advanceCandidateToNextStage: vi.fn()
};

const mockTradingDashboardData = {
  timeElapsed: 0,
  getProgressValue: vi.fn(() => 0),
  getTotalPnL: vi.fn(() => 0),
  getTotalPnLPercentage: vi.fn(() => 0),
  getDisplayPortfolioValue: vi.fn(() => 1000),
  getDisplayStartValue: vi.fn(() => 1000),
  hasValidSimulation: vi.fn(() => false)
};

describe('useDashboardState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    const { useSettingsV2Store } = require('@/stores/settingsV2');
    const { useSimulation } = require('@/hooks/useSimulation');
    const { usePortfolioData } = require('@/hooks/usePortfolioData');
    const { useTradingDashboardData } = require('@/hooks/useTradingDashboardData');
    const { useCentralPortfolioService } = require('@/hooks/useCentralPortfolioService');
    const { useCandidates } = require('@/hooks/useCandidates');
    
    useSettingsV2Store.mockReturnValue(mockSettingsV2Store);
    usePortfolioData.mockReturnValue(mockPortfolioData);
    useCentralPortfolioService.mockReturnValue(mockCentralPortfolio);
    useSimulation.mockReturnValue(mockSimulation);
    useCandidates.mockReturnValue(mockCandidates);
    useTradingDashboardData.mockReturnValue(mockTradingDashboardData);
  });

  it('should provide consolidated dashboard state', () => {
    const { result } = renderHook(() => useDashboardState());

    expect(result.current).toMatchObject({
      userSettings: expect.objectContaining({
        tradingMode: 'simulation',
        tradingStrategy: 'balanced'
      }),
      apiKeys: expect.objectContaining({
        kucoinApiKey: 'test-key',
        kucoinApiSecret: 'test-secret',
        kucoinApiPassphrase: 'test-pass',
        openRouterApiKey: 'test-openrouter-key'
      }),
      candidates: [],
      isLoading: false,
      hasError: false,
      hasData: true
    });
  });

  it('should handle loading states correctly', () => {
    const { usePortfolioData } = require('@/hooks/usePortfolioData');
    const { useCentralPortfolioService } = require('@/hooks/useCentralPortfolioService');
    
    usePortfolioData.mockReturnValue({ ...mockPortfolioData, isLoading: true });
    useCentralPortfolioService.mockReturnValue({ ...mockCentralPortfolio, isLoading: true });

    const { result } = renderHook(() => useDashboardState());

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error states correctly', () => {
    const { usePortfolioData } = require('@/hooks/usePortfolioData');
    
    usePortfolioData.mockReturnValue({ 
      ...mockPortfolioData, 
      error: new Error('Portfolio fetch failed') 
    });

    const { result } = renderHook(() => useDashboardState());

    expect(result.current.hasError).toBe(true);
  });

  it('should provide candidate management functions', () => {
    const { result } = renderHook(() => useDashboardState());

    expect(result.current).toHaveProperty('updateCandidates');
    expect(result.current).toHaveProperty('updateCandidateStatus');
    expect(result.current).toHaveProperty('addCandidate');
    expect(result.current).toHaveProperty('clearCandidates');
    expect(result.current).toHaveProperty('advanceCandidateToNextStage');
  });

  it('should generate simulation data for log correctly', () => {
    const mockSimulationState = {
      startTime: Date.now() - 60000,
      isActive: true,
      startPortfolioValue: 1000,
      currentPortfolioValue: 1100,
      openPositions: [{ id: '1', assetPair: 'BTC-USDT' }]
    };

    const { useSimulation } = require('@/hooks/useSimulation');
    const { useTradingDashboardData } = require('@/hooks/useTradingDashboardData');
    
    useSimulation.mockReturnValue({ 
      ...mockSimulation, 
      simulationState: mockSimulationState 
    });
    useTradingDashboardData.mockReturnValue({
      ...mockTradingDashboardData,
      hasValidSimulation: vi.fn(() => true),
      getTotalPnL: vi.fn(() => 100),
      getTotalPnLPercentage: vi.fn(() => 10)
    });

    const { result } = renderHook(() => useDashboardState());
    
    const logData = result.current.getSimulationDataForLog();
    
    expect(logData).toMatchObject({
      startTime: mockSimulationState.startTime,
      startValue: 1000,
      currentValue: 1100,
      totalPnL: 100,
      totalPnLPercent: 10,
      totalTrades: 1
    });
  });
});
