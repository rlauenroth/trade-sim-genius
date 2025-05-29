
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';
import { useRiskManagement } from '../useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { getOrderbookSnapshot, getSymbolInfo, roundToTickSize, validateOrderSize } from '@/utils/kucoin/marketData';

export const useSimulatedTradeExecution = () => {
  const executeSimulatedTrade = useCallback(async (
    signal: Signal,
    simulationState: SimulationState,
    saveSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void,
    addTradeLog: (tradeData: any) => void,
    addPortfolioUpdateLog: (valueBefore: number, valueAfter: number, reason: string) => void,
    strategy: string,
    getTradeDisplayInfo: (portfolioValue: number, strategy: string) => any
  ) => {
    let currentPrice: number;
    let priceSource: string;
    let spread: number = 0;
    
    try {
      // Convert signal.assetPair format to KuCoin format if needed
      const kucoinSymbol = signal.assetPair.replace('/', '-');
      
      // Phase 1: Get realistic execution price from orderbook
      if (typeof signal.entryPriceSuggestion === 'number') {
        // Use AI-suggested price if it's a number
        currentPrice = signal.entryPriceSuggestion;
        priceSource = 'AI-Vorschlag';
        
        loggingService.logEvent('TRADE', 'Using AI-suggested price', {
          assetPair: signal.assetPair,
          price: currentPrice,
          source: 'ai_suggestion'
        });
      } else {
        // Get orderbook snapshot for realistic market order execution
        try {
          const orderbook = await getOrderbookSnapshot(kucoinSymbol);
          
          // For BUY orders, use bestAsk (worse price for buyer)
          // For SELL orders, use bestBid (worse price for seller)
          if (signal.signalType === 'BUY') {
            currentPrice = orderbook.bestAsk > 0 ? orderbook.bestAsk : orderbook.price;
            priceSource = orderbook.bestAsk > 0 ? 'Best Ask (Market Buy)' : 'Last Price (Fallback)';
          } else {
            currentPrice = orderbook.bestBid > 0 ? orderbook.bestBid : orderbook.price;
            priceSource = orderbook.bestBid > 0 ? 'Best Bid (Market Sell)' : 'Last Price (Fallback)';
          }
          
          // Calculate spread for logging
          if (orderbook.bestBid > 0 && orderbook.bestAsk > 0) {
            spread = ((orderbook.bestAsk - orderbook.bestBid) / orderbook.bestBid) * 100;
          }
          
          loggingService.logEvent('TRADE', 'Using realistic market price', {
            assetPair: signal.assetPair,
            signalType: signal.signalType,
            bestBid: orderbook.bestBid,
            bestAsk: orderbook.bestAsk,
            lastPrice: orderbook.price,
            executionPrice: currentPrice,
            spread: spread.toFixed(4) + '%',
            source: 'orderbook_snapshot'
          });
          
        } catch (orderbookError) {
          console.log('Orderbook fetch failed, using fallback price');
          currentPrice = signal.assetPair.includes('BTC') ? 60000 : 3000;
          priceSource = 'Fallback (Mock)';
          
          loggingService.logEvent('TRADE', 'Using fallback mock price', {
            assetPair: signal.assetPair,
            mockPrice: currentPrice,
            reason: 'orderbook_unavailable',
            error: orderbookError instanceof Error ? orderbookError.message : 'unknown'
          });
        }
      }
    } catch (error) {
      console.log('Price determination failed, using mock price');
      currentPrice = signal.assetPair.includes('BTC') ? 60000 : 3000;
      priceSource = 'Fallback (Mock)';
      
      loggingService.logEvent('TRADE', 'Using mock price due to error', {
        assetPair: signal.assetPair,
        mockPrice: currentPrice,
        reason: 'price_fetch_error',
        error: error instanceof Error ? error.message : 'unknown'
      });
    }
    
    const availableUSDT = simulationState.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity || 0;
    const { calculatePositionSize } = useRiskManagement(strategy);
    const positionResult = calculatePositionSize(simulationState.currentPortfolioValue, availableUSDT, strategy);
    
    loggingService.logEvent('TRADE', 'Position size calculated', {
      portfolioValue: simulationState.currentPortfolioValue,
      availableUSDT,
      strategy,
      positionResult
    });
    
    if (!positionResult.isValid) {
      loggingService.logEvent('TRADE', 'Trade rejected - invalid position size', {
        reason: positionResult.reason,
        portfolioValue: simulationState.currentPortfolioValue,
        availableUSDT,
        strategy
      });
      
      addLogEntry('WARNING', positionResult.reason || 'Trade nicht möglich');
      toast({
        title: "Trade nicht möglich",
        description: positionResult.reason,
        variant: "destructive"
      });
      return;
    }
    
    let actualPositionSize = positionResult.size;
    let quantity = actualPositionSize / currentPrice;
    let finalPrice = currentPrice;
    
    // Phase 2: Apply tick size compliance if symbol info is available
    try {
      const kucoinSymbol = signal.assetPair.replace('/', '-');
      const symbolInfo = await getSymbolInfo(kucoinSymbol);
      
      if (symbolInfo) {
        // Round price to valid increment (conservative rounding)
        if (signal.signalType === 'BUY') {
          // For buy orders, round price up (worse for buyer)
          finalPrice = roundToTickSize(currentPrice, symbolInfo.priceIncrement, true);
        } else {
          // For sell orders, round price down (worse for seller)
          finalPrice = roundToTickSize(currentPrice, symbolInfo.priceIncrement, false);
        }
        
        // Recalculate quantity with adjusted price
        quantity = actualPositionSize / finalPrice;
        
        // Validate and adjust order size
        const validation = validateOrderSize(finalPrice, quantity, symbolInfo);
        
        if (!validation.isValid) {
          loggingService.logEvent('TRADE', 'Trade rejected - KuCoin size validation failed', {
            reason: validation.reason,
            price: finalPrice,
            quantity,
            symbolInfo: {
              baseMinSize: symbolInfo.baseMinSize,
              quoteMinSize: symbolInfo.quoteMinSize
            }
          });
          
          addLogEntry('WARNING', validation.reason || 'Order-Validierung fehlgeschlagen');
          toast({
            title: "Trade nicht möglich",
            description: validation.reason,
            variant: "destructive"
          });
          return;
        }
        
        // Use adjusted quantity if provided
        if (validation.adjustedQuantity) {
          quantity = validation.adjustedQuantity;
          actualPositionSize = quantity * finalPrice; // Recalculate position size
        }
        
        loggingService.logEvent('TRADE', 'Tick size compliance applied', {
          assetPair: signal.assetPair,
          originalPrice: currentPrice,
          adjustedPrice: finalPrice,
          priceIncrement: symbolInfo.priceIncrement,
          originalQuantity: actualPositionSize / currentPrice,
          adjustedQuantity: quantity,
          baseIncrement: symbolInfo.baseIncrement,
          finalPositionSize: actualPositionSize
        });
        
        addLogEntry('INFO', `Tick-Size Anpassung: Preis ${currentPrice.toFixed(8)} → ${finalPrice.toFixed(8)}, Menge auf ${quantity.toFixed(8)} gerundet`);
      } else {
        loggingService.logEvent('TRADE', 'Symbol info not available, skipping tick size compliance', {
          assetPair: signal.assetPair,
          kucoinSymbol
        });
      }
    } catch (symbolError) {
      console.log('Symbol info fetch failed, proceeding without tick size compliance');
      loggingService.logEvent('TRADE', 'Tick size compliance skipped due to error', {
        assetPair: signal.assetPair,
        error: symbolError instanceof Error ? symbolError.message : 'unknown'
      });
    }
    
    const tradingFee = actualPositionSize * 0.001;
    
    const newPosition: Position = {
      id: `pos_${Date.now()}`,
      assetPair: signal.assetPair,
      type: signal.signalType as 'BUY' | 'SELL',
      entryPrice: finalPrice,
      quantity,
      takeProfit: signal.takeProfitPrice,
      stopLoss: signal.stopLossPrice,
      unrealizedPnL: 0,
      openTimestamp: Date.now()
    };

    const portfolioValueBefore = simulationState.currentPortfolioValue;
    const updatedAssets = simulationState.paperAssets.map(asset => {
      if (asset.symbol === 'USDT') {
        return { ...asset, quantity: asset.quantity - actualPositionSize - tradingFee };
      }
      return asset;
    });
    
    const assetSymbol = signal.assetPair.split('/')[0] || signal.assetPair.split('-')[0];
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

    const portfolioValueAfter = simulationState.currentPortfolioValue - tradingFee;
    const updatedState = {
      ...simulationState,
      openPositions: [...simulationState.openPositions, newPosition],
      paperAssets: updatedAssets,
      currentPortfolioValue: portfolioValueAfter
    };

    loggingService.logEvent('TRADE', 'Realistic simulation trade executed successfully', {
      positionId: newPosition.id,
      assetPair: signal.assetPair,
      type: signal.signalType,
      quantity,
      originalPrice: currentPrice,
      executionPrice: finalPrice,
      priceSource,
      spread: spread ? `${spread.toFixed(4)}%` : 'N/A',
      fee: tradingFee,
      totalValue: actualPositionSize,
      portfolioValueBefore,
      portfolioValueAfter,
      openPositionsCount: updatedState.openPositions.length
    });

    saveSimulationState(updatedState);
    
    // Enhanced logging with price details
    addTradeLog({
      id: newPosition.id,
      assetPair: signal.assetPair,
      type: signal.signalType,
      quantity,
      price: finalPrice,
      fee: tradingFee,
      totalValue: actualPositionSize,
      isRealTrade: false
    });
    
    addPortfolioUpdateLog(portfolioValueBefore, portfolioValueAfter, `Trade ausgeführt: ${signal.signalType} ${signal.assetPair}`);
    
    const displayInfo = getTradeDisplayInfo(simulationState.currentPortfolioValue, strategy);
    
    addLogEntry('SUCCESS', `Position eröffnet: ${quantity.toFixed(6)} ${assetSymbol} @ $${finalPrice.toFixed(2)}`);
    addLogEntry('INFO', `Preis-Quelle: ${priceSource}${spread > 0 ? `, Spread: ${spread.toFixed(4)}%` : ''}`);
    addLogEntry('INFO', `Handelsgröße: $${actualPositionSize.toFixed(2)} (max(${displayInfo.percentage}% Portfolio, $${displayInfo.minimum})), Gebühr: $${tradingFee.toFixed(2)}`);
    
    toast({
      title: "Position eröffnet",
      description: `${signal.signalType} ${signal.assetPair} für $${actualPositionSize.toFixed(2)} (${priceSource})`,
    });
  }, []);

  return { executeSimulatedTrade };
};
