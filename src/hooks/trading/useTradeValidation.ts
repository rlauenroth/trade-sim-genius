
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { useRiskManagement } from '../useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { getOrderbookSnapshot, getSymbolInfo, roundToTickSize, validateOrderSize } from '@/utils/kucoin/marketData';

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
      
      // Get realistic market price using enhanced market data
      let currentPrice: number;
      try {
        const kucoinSymbol = signal.assetPair.replace('/', '-');
        
        if (typeof signal.entryPriceSuggestion === 'number') {
          currentPrice = signal.entryPriceSuggestion;
        } else {
          // Get orderbook snapshot for realistic pricing
          const orderbook = await getOrderbookSnapshot(kucoinSymbol);
          
          if (signal.signalType === 'BUY') {
            currentPrice = orderbook.bestAsk > 0 ? orderbook.bestAsk : orderbook.price;
          } else {
            currentPrice = orderbook.bestBid > 0 ? orderbook.bestBid : orderbook.price;
          }
        }
      } catch (priceError) {
        // Fallback to mock price if market data unavailable
        currentPrice = signal.assetPair.includes('BTC') ? 60000 : 3000;
        loggingService.logEvent('TRADE', 'Auto-trade using fallback price', {
          assetPair: signal.assetPair,
          fallbackPrice: currentPrice,
          reason: 'market_data_unavailable'
        });
      }
      
      // Calculate position size based on portfolio value
      const availableUSDT = simulationState.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity || 0;
      const positionResult = calculatePositionSize(simulationState.currentPortfolioValue, availableUSDT, 'balanced');
      
      if (!positionResult.isValid) {
        return {
          success: false,
          error: positionResult.reason || 'Invalid position size'
        };
      }
      
      let actualPositionSize = positionResult.size;
      let quantity = actualPositionSize / currentPrice;
      let finalPrice = currentPrice;
      
      // Apply tick size compliance if available
      try {
        const kucoinSymbol = signal.assetPair.replace('/', '-');
        const symbolInfo = await getSymbolInfo(kucoinSymbol);
        
        if (symbolInfo) {
          // Round price conservatively
          if (signal.signalType === 'BUY') {
            finalPrice = roundToTickSize(currentPrice, symbolInfo.priceIncrement, true);
          } else {
            finalPrice = roundToTickSize(currentPrice, symbolInfo.priceIncrement, false);
          }
          
          // Recalculate and validate quantity
          quantity = actualPositionSize / finalPrice;
          const validation = validateOrderSize(finalPrice, quantity, symbolInfo);
          
          if (!validation.isValid) {
            return {
              success: false,
              error: validation.reason || 'Order validation failed'
            };
          }
          
          if (validation.adjustedQuantity) {
            quantity = validation.adjustedQuantity;
            actualPositionSize = quantity * finalPrice;
          }
        }
      } catch (symbolError) {
        // Continue without tick size compliance if not available
        loggingService.logEvent('TRADE', 'Auto-trade proceeding without tick size compliance', {
          assetPair: signal.assetPair,
          reason: 'symbol_info_unavailable'
        });
      }
      
      const tradingFee = actualPositionSize * 0.001; // 0.1% fee
      const assetSymbol = signal.assetPair.split('/')[0] || signal.assetPair.split('-')[0];
      
      // Create new position - TypeScript now knows signal.signalType is 'BUY' | 'SELL'
      const newPosition: Position = {
        id: `pos_${Date.now()}`,
        assetPair: signal.assetPair,
        type: signal.signalType, // This is now guaranteed to be 'BUY' | 'SELL' due to type guard
        entryPrice: finalPrice,
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
          entryPrice: finalPrice
        });
      }

      loggingService.logEvent('TRADE', 'Realistic auto-trade executed successfully', {
        positionId: newPosition.id,
        assetPair: signal.assetPair,
        type: signal.signalType,
        quantity,
        originalPrice: currentPrice,
        finalPrice,
        fee: tradingFee,
        totalValue: actualPositionSize,
        tickSizeCompliant: finalPrice !== currentPrice
      });

      return {
        success: true,
        position: newPosition,
        updatedAssets,
        fee: tradingFee
      };
    } catch (error) {
      loggingService.logError('Realistic auto-trade execution failed', {
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
