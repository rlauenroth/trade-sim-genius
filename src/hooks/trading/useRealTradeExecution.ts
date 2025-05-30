
import { useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';
import { useRiskManagement } from '../useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { realTradingService } from '@/services/realTrading';
import { kucoinWebsocketService } from '@/services/kucoinWebsocketService';
import { useSettingsV2Store } from '@/stores/settingsV2';

export const useRealTradeExecution = () => {
  const { settings } = useSettingsV2Store();

  const executeRealTrade = useCallback(async (
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    addTradeLog: (tradeData: any) => void
  ) => {
    // Create API keys from centralized store
    const apiKeys = {
      kucoin: {
        key: settings.kucoin.key,
        secret: settings.kucoin.secret,
        passphrase: settings.kucoin.passphrase
      },
      openRouter: {
        apiKey: settings.openRouter.apiKey
      }
    };

    if (!apiKeys.kucoin.key || !apiKeys.kucoin.secret || !apiKeys.kucoin.passphrase) {
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
  }, [settings]);

  return { executeRealTrade };
};
