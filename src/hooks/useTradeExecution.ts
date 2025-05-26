
import { useCallback } from 'react';
import { Signal, SimulationState, Position } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';

export const useTradeExecution = () => {
  const acceptSignal = useCallback(async (
    signal: Signal,
    simulationState: SimulationState | null,
    addLogEntry: (type: any, message: string) => void,
    saveSimulationState: (state: SimulationState) => void,
    setCurrentSignal: (signal: Signal | null) => void,
    startAISignalGeneration: () => void
  ) => {
    if (!simulationState || !signal) return;

    if (signal.signalType !== 'BUY' && signal.signalType !== 'SELL') {
      addLogEntry('INFO', `Signal ${signal.signalType} für ${signal.assetPair} ist nicht handelbar`);
      setCurrentSignal(null);
      return;
    }

    addLogEntry('TRADE', `Signal angenommen: ${signal.signalType} ${signal.assetPair}`);
    
    try {
      let currentPrice: number;
      
      try {
        currentPrice = typeof signal.entryPriceSuggestion === 'number' 
          ? signal.entryPriceSuggestion 
          : (signal.assetPair.includes('BTC') ? 60000 : 3000);
      } catch (error) {
        console.log('Using mock price due to API limitation');
        currentPrice = signal.assetPair.includes('BTC') ? 60000 : 3000;
      }
      
      const idealPositionPercent = signal.suggestedPositionSizePercent || 3.0;
      const idealPositionSize = (simulationState.currentPortfolioValue * idealPositionPercent) / 100;
      const availableUSDT = simulationState.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity || 0;
      const actualPositionSize = Math.min(idealPositionSize, availableUSDT);
      
      const minTradeSize = 50;
      if (actualPositionSize < minTradeSize) {
        addLogEntry('WARNING', `Nicht genügend USDT für Trade. Benötigt: $${minTradeSize}, Verfügbar: $${availableUSDT.toFixed(2)}`);
        setCurrentSignal(null);
        return;
      }
      
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

      const updatedState = {
        ...simulationState,
        openPositions: [...simulationState.openPositions, newPosition],
        paperAssets: updatedAssets,
        currentPortfolioValue: simulationState.currentPortfolioValue - tradingFee
      };

      saveSimulationState(updatedState);
      setCurrentSignal(null);
      
      addLogEntry('SUCCESS', `Position eröffnet: ${quantity.toFixed(6)} ${assetSymbol} @ $${currentPrice.toFixed(2)}`);
      addLogEntry('INFO', `Handelsgröße: $${actualPositionSize.toFixed(2)}, Gebühr: $${tradingFee.toFixed(2)}`);
      
      toast({
        title: "Position eröffnet",
        description: `${signal.signalType} ${signal.assetPair} für $${actualPositionSize.toFixed(2)}`,
      });

      setTimeout(() => {
        startAISignalGeneration();
      }, 45000);

    } catch (error) {
      console.error('Error executing trade:', error);
      addLogEntry('ERROR', 'Fehler bei der Trade-Ausführung');
      setCurrentSignal(null);
    }
  }, []);

  const ignoreSignal = useCallback((
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void,
    generateMockSignal: () => void
  ) => {
    addLogEntry('INFO', `Signal ignoriert: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
    
    toast({
      title: "Signal ignoriert",
      description: `${signal.signalType} ${signal.assetPair} wurde übersprungen`,
    });

    setTimeout(() => {
      generateMockSignal();
    }, 15000);
  }, []);

  return {
    acceptSignal,
    ignoreSignal
  };
};
