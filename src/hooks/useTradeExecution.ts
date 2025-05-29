
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';
import { useRiskManagement } from './useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { realTradingService } from '@/services/realTradingService';
import { kucoinWebsocketService } from '@/services/kucoinWebsocketService';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useAppState } from './useAppState';

export const useTradeExecution = () => {
  const { settings } = useSettingsV2Store();
  const { apiKeys } = useAppState();

  const acceptSignal = useCallback(async (
    signal: Signal,
    simulationState: SimulationState | null,
    addLogEntry: (type: any, message: string) => void,
    saveSimulationState: (state: SimulationState) => void,
    setCurrentSignal: (signal: Signal | null) => void,
    startAISignalGeneration: () => void,
    addTradeLog: (tradeData: any) => void,
    addSignalLog: (signal: Signal, action: 'generated' | 'accepted' | 'ignored') => void,
    addPortfolioUpdateLog: (valueBefore: number, valueAfter: number, reason: string) => void,
    strategy: string = 'balanced'
  ) => {
    if (!simulationState || !signal) return;

    loggingService.logEvent('TRADE', 'Signal acceptance started', {
      signalType: signal.signalType,
      assetPair: signal.assetPair,
      entryPrice: signal.entryPriceSuggestion,
      strategy,
      portfolioValue: simulationState.currentPortfolioValue,
      tradingMode: settings.tradingMode
    });

    const { calculatePositionSize, getTradeDisplayInfo } = useRiskManagement(strategy);

    if (signal.signalType !== 'BUY' && signal.signalType !== 'SELL') {
      loggingService.logEvent('TRADE', 'Signal rejected - not tradable', {
        signalType: signal.signalType,
        assetPair: signal.assetPair,
        reason: 'signal_type_not_tradable'
      });
      
      addLogEntry('INFO', `Signal ${signal.signalType} für ${signal.assetPair} ist nicht handelbar`);
      addSignalLog(signal, 'ignored');
      setCurrentSignal(null);
      return;
    }

    addLogEntry('TRADE', `Signal angenommen: ${signal.signalType} ${signal.assetPair}`);
    addSignalLog(signal, 'accepted');
    
    try {
      // Check if we're in real trading mode
      if (settings.tradingMode === 'real') {
        await executeRealTrade(signal, addLogEntry, addTradeLog);
      } else {
        await executeSimulatedTrade(signal, simulationState, saveSimulationState, addLogEntry, addTradeLog, addPortfolioUpdateLog, strategy, getTradeDisplayInfo);
      }
      
      setCurrentSignal(null);

      setTimeout(() => {
        startAISignalGeneration();
      }, 45000);

    } catch (error) {
      console.error('Error executing trade:', error);
      
      loggingService.logError('Trade execution failed', {
        signalType: signal.signalType,
        assetPair: signal.assetPair,
        error: error instanceof Error ? error.message : 'unknown',
        portfolioValue: simulationState.currentPortfolioValue,
        tradingMode: settings.tradingMode
      });
      
      addLogEntry('ERROR', `Fehler bei der Trade-Ausführung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setCurrentSignal(null);
    }
  }, [settings.tradingMode]);

  const executeRealTrade = useCallback(async (
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    addTradeLog: (tradeData: any) => void
  ) => {
    if (!apiKeys) {
      throw new Error('API Keys nicht konfiguriert für Real-Trading');
    }

    // Setup real trading service with current API keys and risk limits
    realTradingService.setApiKeys(apiKeys);
    realTradingService.setRiskLimits(settings.riskLimits);

    // Setup WebSocket monitoring if not already connected
    if (!kucoinWebsocketService.isConnected()) {
      const connected = await kucoinWebsocketService.connect();
      if (connected) {
        kucoinWebsocketService.onOrderUpdate((update) => {
          addLogEntry('TRADE', `Order Update: ${update.orderId} - ${update.status}`);
          
          if (update.status === 'filled') {
            toast({
              title: "Order ausgeführt",
              description: `${update.side.toUpperCase()} Order für ${update.symbol} wurde vollständig ausgeführt`,
            });
          }
        });
      }
    }

    // Calculate position size and create trade order
    const currentPrice = typeof signal.entryPriceSuggestion === 'number' 
      ? signal.entryPriceSuggestion 
      : (signal.assetPair.includes('BTC') ? 60000 : 3000);

    const { calculatePositionSize } = useRiskManagement(settings.tradingStrategy);
    const positionResult = calculatePositionSize(10000, 1000, settings.tradingStrategy); // Placeholder values - should get real portfolio value

    if (!positionResult.isValid) {
      throw new Error(positionResult.reason || 'Invalid position size');
    }

    const quantity = (positionResult.size / currentPrice).toString();
    const tradeOrder = {
      symbol: signal.assetPair.replace('/', '-'), // Convert to KuCoin format
      side: signal.signalType.toLowerCase() as 'buy' | 'sell',
      type: 'market' as const,
      size: quantity
    };

    addLogEntry('TRADE', `Führe Real-Trade aus: ${signal.signalType} ${quantity} ${signal.assetPair} @ $${currentPrice}`);

    // Execute the real trade
    const orderResponse = await realTradingService.executeRealTrade(tradeOrder);

    if (orderResponse) {
      // Subscribe to WebSocket updates for this order
      kucoinWebsocketService.subscribeToOrder(orderResponse.orderId);

      addTradeLog({
        id: orderResponse.orderId,
        assetPair: signal.assetPair,
        type: signal.signalType,
        quantity: parseFloat(quantity),
        price: currentPrice,
        fee: 0, // Will be updated when order is filled
        totalValue: positionResult.size,
        isRealTrade: true
      });

      toast({
        title: "Real-Trade ausgeführt",
        description: `${signal.signalType} Order für ${signal.assetPair} wurde gesendet`,
      });

      loggingService.logSuccess(`Real trade executed: Order ID ${orderResponse.orderId}`);
    }
  }, [apiKeys, settings]);

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
      type: signal.signalType,
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

  const ignoreSignal = useCallback((
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void,
    startAISignalGeneration: () => void,
    addSignalLog: (signal: Signal, action: 'generated' | 'accepted' | 'ignored') => void
  ) => {
    loggingService.logEvent('TRADE', 'Signal ignored', {
      signalType: signal.signalType,
      assetPair: signal.assetPair,
      reason: 'user_choice'
    });
    
    addLogEntry('INFO', `Signal ignoriert: ${signal.signalType} ${signal.assetPair}`);
    addSignalLog(signal, 'ignored');
    setCurrentSignal(null);
    
    toast({
      title: "Signal ignoriert",
      description: `${signal.signalType} ${signal.assetPair} wurde übersprungen`,
    });

    setTimeout(() => {
      startAISignalGeneration();
    }, 15000);
  }, []);

  // Fixed executeTradeFromSignal method with proper type checking
  const executeTradeFromSignal = useCallback(async (signal: Signal, simulationState: SimulationState) => {
    try {
      // Add validation for tradeable signals only
      if (signal.signalType !== 'BUY' && signal.signalType !== 'SELL') {
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
      
      // Create new position - now with proper type narrowing
      const newPosition: Position = {
        id: `pos_${Date.now()}`,
        assetPair: signal.assetPair,
        type: signal.signalType, // This is now guaranteed to be 'BUY' | 'SELL'
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
  }, []);

  return {
    acceptSignal,
    ignoreSignal,
    executeTradeFromSignal
  };
};
