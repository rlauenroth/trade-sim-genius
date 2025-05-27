
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';
import { useRiskManagement } from './useRiskManagement';
import { loggingService } from '@/services/loggingService';

export const useTradeExecution = () => {
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
      portfolioValue: simulationState.currentPortfolioValue
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
        setCurrentSignal(null);
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

      loggingService.logEvent('TRADE', 'Trade executed successfully', {
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
      setCurrentSignal(null);
      
      // Enhanced logging
      addTradeLog({
        id: newPosition.id,
        assetPair: signal.assetPair,
        type: signal.signalType,
        quantity,
        price: currentPrice,
        fee: tradingFee,
        totalValue: actualPositionSize
      });
      
      addPortfolioUpdateLog(portfolioValueBefore, portfolioValueAfter, `Trade ausgeführt: ${signal.signalType} ${signal.assetPair}`);
      
      const displayInfo = getTradeDisplayInfo(simulationState.currentPortfolioValue, strategy);
      
      addLogEntry('SUCCESS', `Position eröffnet: ${quantity.toFixed(6)} ${assetSymbol} @ $${currentPrice.toFixed(2)}`);
      addLogEntry('INFO', `Handelsgröße: $${actualPositionSize.toFixed(2)} (max(${displayInfo.percentage}% Portfolio, $${displayInfo.minimum})), Gebühr: $${tradingFee.toFixed(2)}`);
      
      toast({
        title: "Position eröffnet",
        description: `${signal.signalType} ${signal.assetPair} für $${actualPositionSize.toFixed(2)}`,
      });

      setTimeout(() => {
        startAISignalGeneration();
      }, 45000);

    } catch (error) {
      console.error('Error executing trade:', error);
      
      loggingService.logError('Trade execution failed', {
        signalType: signal.signalType,
        assetPair: signal.assetPair,
        error: error instanceof Error ? error.message : 'unknown',
        portfolioValue: simulationState.currentPortfolioValue
      });
      
      addLogEntry('ERROR', 'Fehler bei der Trade-Ausführung');
      setCurrentSignal(null);
    }
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

  return {
    acceptSignal,
    ignoreSignal
  };
};
