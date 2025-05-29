
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';
import { useRiskManagement } from '../useRiskManagement';
import { loggingService } from '@/services/loggingService';

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
    
    try {
      currentPrice = typeof signal.entryPriceSuggestion === 'number' 
        ? signal.entryPriceSuggestion 
        : (signal.assetPair.includes('BTC') ? 60000 : 3000);
    } catch (error) {
      console.log('Using mock price due to API limitation');
      currentPrice = signal.assetPair.includes('BTC') ? 60000 : 3000;
      
      loggingService.logEvent('TRADE', 'Using mock price', {
        assetPair: signal.assetPair,
        mockPrice: currentPrice,
        reason: 'api_limitation'
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
    
    const actualPositionSize = positionResult.size;
    const quantity = actualPositionSize / currentPrice;
    const tradingFee = actualPositionSize * 0.001;
    
    const newPosition: Position = {
      id: `pos_${Date.now()}`,
      assetPair: signal.assetPair,
      type: signal.signalType as 'BUY' | 'SELL', // Type assertion since we've validated it's tradeable
      entryPrice: currentPrice,
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
        entryPrice: currentPrice
      });
    }

    const portfolioValueAfter = simulationState.currentPortfolioValue - tradingFee;
    const updatedState = {
      ...simulationState,
      openPositions: [...simulationState.openPositions, newPosition],
      paperAssets: updatedAssets,
      currentPortfolioValue: portfolioValueAfter
    };

    loggingService.logEvent('TRADE', 'Simulation trade executed successfully', {
      positionId: newPosition.id,
      assetPair: signal.assetPair,
      type: signal.signalType,
      quantity,
      price: currentPrice,
      fee: tradingFee,
      totalValue: actualPositionSize,
      portfolioValueBefore,
      portfolioValueAfter,
      openPositionsCount: updatedState.openPositions.length
    });

    saveSimulationState(updatedState);
    
    // Enhanced logging
    addTradeLog({
      id: newPosition.id,
      assetPair: signal.assetPair,
      type: signal.signalType,
      quantity,
      price: currentPrice,
      fee: tradingFee,
      totalValue: actualPositionSize,
      isRealTrade: false
    });
    
    addPortfolioUpdateLog(portfolioValueBefore, portfolioValueAfter, `Trade ausgeführt: ${signal.signalType} ${signal.assetPair}`);
    
    const displayInfo = getTradeDisplayInfo(simulationState.currentPortfolioValue, strategy);
    
    addLogEntry('SUCCESS', `Position eröffnet: ${quantity.toFixed(6)} ${assetSymbol} @ $${currentPrice.toFixed(2)}`);
    addLogEntry('INFO', `Handelsgröße: $${actualPositionSize.toFixed(2)} (max(${displayInfo.percentage}% Portfolio, $${displayInfo.minimum})), Gebühr: $${tradingFee.toFixed(2)}`);
    
    toast({
      title: "Position eröffnet",
      description: `${signal.signalType} ${signal.assetPair} für $${actualPositionSize.toFixed(2)}`,
    });
  }, []);

  return { executeSimulatedTrade };
};
