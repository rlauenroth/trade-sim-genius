
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { useRiskManagement } from '../useRiskManagement';
import { loggingService } from '@/services/loggingService';

export const useTradeValidation = () => {
  const isTradeableSignal = useCallback((signal: Signal): signal is Signal & { signalType: 'BUY' | 'SELL' } => {
    return signal.signalType === 'BUY' || signal.signalType === 'SELL';
  }, []);

  const executeTradeFromSignal = useCallback(async (signal: Signal, simulationState: SimulationState) => {
    try {
      // Add validation for tradeable signals only
      if (!isTradeableSignal(signal)) {
        return {
          success: false,
          error: `Signal type ${signal.signalType} is not tradeable`
        };
      }

      const { calculatePositionSize } = useRiskManagement('balanced');
      
      // Get current market price
      const currentPrice = typeof signal.entryPriceSuggestion === 'number' 
        ? signal.entryPriceSuggestion 
        : (signal.assetPair.includes('BTC') ? 60000 : 3000);
      
      // Calculate position size based on portfolio value
      const availableUSDT = simulationState.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity || 0;
      const positionResult = calculatePositionSize(simulationState.currentPortfolioValue, availableUSDT, 'balanced');
      
      if (!positionResult.isValid) {
        return {
          success: false,
          error: positionResult.reason || 'Invalid position size'
        };
      }
      
      const actualPositionSize = positionResult.size;
      const quantity = actualPositionSize / currentPrice;
      const tradingFee = actualPositionSize * 0.001; // 0.1% fee
      const assetSymbol = signal.assetPair.split('/')[0] || signal.assetPair.split('-')[0];
      
      // Create new position - TypeScript now knows signal.signalType is 'BUY' | 'SELL'
      const newPosition: Position = {
        id: `pos_${Date.now()}`,
        assetPair: signal.assetPair,
        type: signal.signalType, // This is now guaranteed to be 'BUY' | 'SELL' due to type guard
        entryPrice: currentPrice,
        quantity,
        takeProfit: signal.takeProfitPrice,
        stopLoss: signal.stopLossPrice,
        unrealizedPnL: 0,
        openTimestamp: Date.now()
      };

      // Update assets: reduce USDT, add new asset
      const updatedAssets = simulationState.paperAssets.map(asset => {
        if (asset.symbol === 'USDT') {
          return { ...asset, quantity: asset.quantity - actualPositionSize - tradingFee };
        }
        return asset;
      });
      
      // Add or update the traded asset
      const existingAssetIndex = updatedAssets.findIndex(asset => asset.symbol === assetSymbol);
      if (existingAssetIndex >= 0) {
        updatedAssets[existingAssetIndex].quantity += quantity;
      } else {
        updatedAssets.push({
          symbol: assetSymbol,
          quantity: quantity,
          entryPrice: currentPrice
        });
      }

      loggingService.logEvent('TRADE', 'Auto-trade executed successfully', {
        positionId: newPosition.id,
        assetPair: signal.assetPair,
        type: signal.signalType,
        quantity,
        price: currentPrice,
        fee: tradingFee,
        totalValue: actualPositionSize
      });

      return {
        success: true,
        position: newPosition,
        updatedAssets,
        fee: tradingFee
      };
    } catch (error) {
      loggingService.logError('Auto-trade execution failed', {
        error: error instanceof Error ? error.message : 'unknown',
        assetPair: signal.assetPair,
        signalType: signal.signalType
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [isTradeableSignal]);

  return {
    isTradeableSignal,
    executeTradeFromSignal
  };
};
