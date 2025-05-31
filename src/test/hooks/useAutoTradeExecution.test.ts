
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAutoTradeExecution } from '@/hooks/useAutoTradeExecution';
import { Signal, SimulationState } from '@/types/simulation';

// Mock dependencies
vi.mock('@/hooks/useTradeExecution');
vi.mock('@/hooks/useRiskManagement');
vi.mock('@/services/loggingService');
vi.mock('@/hooks/use-toast');

const mockExecuteTradeFromSignal = vi.fn();
const mockValidateTradeRisk = vi.fn();
const mockToast = vi.fn();

const mockSignal: Signal = {
  assetPair: 'BTC-USDT',
  signalType: 'BUY',
  entryPriceSuggestion: 45000,
  takeProfitPrice: 46000,
  stopLossPrice: 44000,
  confidenceScore: 0.8
};

const mockSimulationState: SimulationState = {
  isActive: true,
  isPaused: false,
  startTime: Date.now(),
  startPortfolioValue: 10000,
  currentPortfolioValue: 10000,
  realizedPnL: 0,
  openPositions: [],
  paperAssets: [{ symbol: 'USDT', quantity: 10000 }],
  autoTradeCount: 0
};

describe('useAutoTradeExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useTradeExecution } = require('@/hooks/useTradeExecution');
    const { useRiskManagement } = require('@/hooks/useRiskManagement');
    const { toast } = require('@/hooks/use-toast');
    
    useTradeExecution.mockReturnValue({
      executeTradeFromSignal: mockExecuteTradeFromSignal
    });
    
    useRiskManagement.mockReturnValue({
      validateTradeRisk: mockValidateTradeRisk
    });
    
    toast.mockImplementation(mockToast);
  });

  it('should execute auto trade successfully', async () => {
    mockValidateTradeRisk.mockReturnValue({ isValid: true });
    mockExecuteTradeFromSignal.mockResolvedValue({
      success: true,
      position: {
        id: 'pos-1',
        assetPair: 'BTC-USDT',
        quantity: 0.1,
        entryPrice: 45000,
        type: 'BUY'
      },
      updatedAssets: [
        { symbol: 'USDT', quantity: 5500 },
        { symbol: 'BTC', quantity: 0.1 }
      ],
      fee: 4.5
    });

    const { result } = renderHook(() => useAutoTradeExecution());
    const mockAddLogEntry = vi.fn();
    const mockUpdateSimulationState = vi.fn();

    await act(async () => {
      const success = await result.current.executeAutoTrade(
        mockSignal,
        mockSimulationState,
        mockUpdateSimulationState,
        mockAddLogEntry
      );
      
      expect(success).toBe(true);
    });

    expect(mockValidateTradeRisk).toHaveBeenCalledWith(mockSignal, mockSimulationState);
    expect(mockExecuteTradeFromSignal).toHaveBeenCalledWith(mockSignal, mockSimulationState);
    expect(mockUpdateSimulationState).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: "Auto-Trade ausgeführt",
      description: "BUY BTC-USDT automatisch ausgeführt"
    });
  });

  it('should reject trade if risk validation fails', async () => {
    mockValidateTradeRisk.mockReturnValue({ 
      isValid: false, 
      reason: 'Exceeds maximum exposure' 
    });

    const { result } = renderHook(() => useAutoTradeExecution());
    const mockAddLogEntry = vi.fn();
    const mockUpdateSimulationState = vi.fn();

    await act(async () => {
      const success = await result.current.executeAutoTrade(
        mockSignal,
        mockSimulationState,
        mockUpdateSimulationState,
        mockAddLogEntry
      );
      
      expect(success).toBe(false);
    });

    expect(mockExecuteTradeFromSignal).not.toHaveBeenCalled();
    expect(mockAddLogEntry).toHaveBeenCalledWith(
      'WARNING',
      'AUTO-TRADE abgelehnt: Exceeds maximum exposure'
    );
  });

  it('should handle trade execution failure with retry logic', async () => {
    mockValidateTradeRisk.mockReturnValue({ isValid: true });
    mockExecuteTradeFromSignal.mockResolvedValue({
      success: false,
      error: 'Insufficient balance'
    });

    const { result } = renderHook(() => useAutoTradeExecution());
    const mockAddLogEntry = vi.fn();
    const mockUpdateSimulationState = vi.fn();

    await act(async () => {
      const success = await result.current.executeAutoTrade(
        mockSignal,
        mockSimulationState,
        mockUpdateSimulationState,
        mockAddLogEntry
      );
      
      expect(success).toBe(false);
    });

    expect(mockAddLogEntry).toHaveBeenCalledWith(
      'ERROR',
      'AUTO-TRADE fehlgeschlagen: Insufficient balance'
    );
    expect(result.current.retryCount).toBe(1);
  });

  it('should pause simulation after max retries', async () => {
    mockValidateTradeRisk.mockReturnValue({ isValid: true });
    mockExecuteTradeFromSignal.mockResolvedValue({
      success: false,
      error: 'Network error'
    });

    const { result } = renderHook(() => useAutoTradeExecution());
    const mockAddLogEntry = vi.fn();
    const mockUpdateSimulationState = vi.fn();

    // Set retry count to 3 (max retries)
    await act(async () => {
      result.current.setRetryCount(3);
    });

    await act(async () => {
      const success = await result.current.executeAutoTrade(
        mockSignal,
        mockSimulationState,
        mockUpdateSimulationState,
        mockAddLogEntry
      );
      
      expect(success).toBe(false);
    });

    expect(mockUpdateSimulationState).toHaveBeenCalledWith({
      ...mockSimulationState,
      isPaused: true
    });
    expect(mockToast).toHaveBeenCalledWith({
      title: "Simulation pausiert",
      description: "Nach 3 Fehlversuchen pausiert: Network error",
      variant: "destructive"
    });
  });

  it('should calculate portfolio value correctly for BUY orders', async () => {
    mockValidateTradeRisk.mockReturnValue({ isValid: true });
    mockExecuteTradeFromSignal.mockResolvedValue({
      success: true,
      position: {
        id: 'pos-1',
        assetPair: 'BTC-USDT',
        quantity: 0.1,
        entryPrice: 45000,
        type: 'BUY'
      },
      updatedAssets: [
        { symbol: 'USDT', quantity: 5495.5 }, // 10000 - 4500 - 4.5 fee
        { symbol: 'BTC', quantity: 0.1 }
      ],
      fee: 4.5
    });

    const { result } = renderHook(() => useAutoTradeExecution());
    const mockAddLogEntry = vi.fn();
    const mockUpdateSimulationState = vi.fn();

    await act(async () => {
      await result.current.executeAutoTrade(
        mockSignal,
        mockSimulationState,
        mockUpdateSimulationState,
        mockAddLogEntry
      );
    });

    const updateCall = mockUpdateSimulationState.mock.calls[0][0];
    expect(updateCall.currentPortfolioValue).toBe(5495.5); // 10000 - 4500 - 4.5
    expect(updateCall.autoTradeCount).toBe(1);
  });
});
