
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';
import { useRiskManagement } from '../useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { getOrderbookSnapshot, getSymbolInfo, roundToTickSize, validateOrderSize } from '@/utils/kucoin/marketData';
import { slippageService } from '@/services/slippageService';
import { portfolioEvaluationService } from '@/services/portfolioEvaluationService';

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
    let orderbookData: any = null;
    
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
          orderbookData = await getOrderbookSnapshot(kucoinSymbol);
          
          // For BUY orders, use bestAsk (worse price for buyer)
          // For SELL orders, use bestBid (worse price for seller)
          if (signal.signalType === 'BUY') {
            currentPrice = orderbookData.bestAsk > 0 ? orderbookData.bestAsk : orderbookData.price;
            priceSource = orderbookData.bestAsk > 0 ? 'Best Ask (Market Buy)' : 'Last Price (Fallback)';
          } else {
            currentPrice = orderbookData.bestBid > 0 ? orderbookData.bestBid : orderbookData.price;
            priceSource = orderbookData.bestBid > 0 ? 'Best Bid (Market Sell)' : 'Last Price (Fallback)';
          }
          
          // Calculate spread for logging
          if (orderbookData.bestBid > 0 && orderbookData.bestAsk > 0) {
            spread = ((orderbookData.bestAsk - orderbookData.bestBid) / orderbookData.bestBid) * 100;
          }
          
          loggingService.logEvent('TRADE', 'Using realistic market price', {
            assetPair: signal.assetPair,
            signalType: signal.signalType,
            bestBid: orderbookData.bestBid,
            bestAsk: orderbookData.bestAsk,
            lastPrice: orderbookData.price,
            executionPrice: currentPrice,
            spread: spread.toFixed(4) + '%',
            source: 'orderbook_snapshot'
          });
          
        } catch (orderbookError) {
          throw new Error(`Orderbook fetch failed: ${orderbookError}`);
        }
      }
    } catch (error) {
      console.error('Price determination failed:', error);
      throw new Error(`Unable to determine execution price: ${error}`);
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
    
    // Phase 4: Apply slippage if orderbook data is available and price wasn't AI-suggested
    if (orderbookData && typeof signal.entryPriceSuggestion !== 'number') {
      try {
        const slippageResult = slippageService.calculateSlippage(
          signal.signalType as 'BUY' | 'SELL',
          actualPositionSize,
          {
            bestBid: orderbookData.bestBid,
            bestAsk: orderbookData.bestAsk,
            spread: orderbookData.bestAsk - orderbookData.bestBid
          },
          strategy
        );
        
        if (slippageResult.slippageBps > 0) {
          finalPrice = slippageResult.adjustedPrice;
          actualPositionSize = quantity * finalPrice; // Recalculate with slippage
          
          addLogEntry('INFO', `Slippage angewendet: ${slippageResult.slippageBps.toFixed(2)} bps (${slippageResult.slippageAmount.toFixed(6)}$)`);
          
          loggingService.logEvent('TRADE', 'Slippage applied to execution price', {
            assetPair: signal.assetPair,
            originalPrice: slippageResult.originalPrice,
            adjustedPrice: slippageResult.adjustedPrice,
            slippageBps: slippageResult.slippageBps,
            strategy
          });
        }
      } catch (slippageError) {
        loggingService.logEvent('TRADE', 'Slippage calculation failed, proceeding without', {
          assetPair: signal.assetPair,
          error: slippageError instanceof Error ? slippageError.message : 'unknown'
        });
      }
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

    // Phase 3: Calculate updated portfolio value using evaluation service
    let portfolioValueAfter = portfolioValueBefore - tradingFee;
    
    try {
      const tempState = {
        ...simulationState,
        openPositions: [...simulationState.openPositions, newPosition],
        paperAssets: updatedAssets
      };
      
      const evaluation = await portfolioEvaluationService.evaluatePortfolio(tempState);
      portfolioValueAfter = evaluation.totalValue;
      
      addLogEntry('INFO', `Portfolio-Bewertung: $${evaluation.totalValue.toFixed(2)} (Unrealisiert: ${evaluation.unrealizedPnL >= 0 ? '+' : ''}$${evaluation.unrealizedPnL.toFixed(2)})`);
    } catch (evaluationError) {
      loggingService.logEvent('TRADE', 'Portfolio evaluation failed, using simple calculation', {
        error: evaluationError instanceof Error ? evaluationError.message : 'unknown'
      });
    }

    const updatedState = {
      ...simulationState,
      openPositions: [...simulationState.openPositions, newPosition],
      paperAssets: updatedAssets,
      currentPortfolioValue: portfolioValueAfter
    };

    loggingService.logEvent('TRADE', 'Enhanced simulation trade executed successfully', {
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
      openPositionsCount: updatedState.openPositions.length,
      tickSizeCompliant: finalPrice !== currentPrice,
      slippageApplied: orderbookData && finalPrice !== (signal.signalType === 'BUY' ? orderbookData.bestAsk : orderbookData.bestBid)
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
