
import { TradeOrder, OrderResponse, RiskLimits } from '@/types/appState';
import { placeOrder, getOrderStatus, cancelOrder } from '@/utils/kucoin/trading';
import { getAccountBalances } from '@/utils/kucoinApi';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/hooks/use-toast';
import { loggingService } from './loggingService';

class RealTradingService {
  private orderPollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Check if trading conditions are met
  async checkTradingConditions(trade: TradeOrder): Promise<{ canTrade: boolean; reason?: string }> {
    try {
      const { riskLimits, apiKeys } = useSettingsStore.getState();
      
      if (!apiKeys?.kucoin) {
        return { canTrade: false, reason: 'Keine API-Schlüssel verfügbar' };
      }

      // Check account balance
      const balances = await getAccountBalances(apiKeys);
      const usdtBalance = balances.find(b => b.currency === 'USDT');
      const currentBalance = parseFloat(usdtBalance?.available || '0');

      if (currentBalance < riskLimits.minBalance) {
        return { 
          canTrade: false, 
          reason: `Mindest-USDT-Saldo unterschritten (${riskLimits.minBalance} USDT erforderlich)` 
        };
      }

      // Check if trade value exceeds max exposure
      const tradeValue = parseFloat(trade.size) * (trade.price ? parseFloat(trade.price) : 0);
      if (tradeValue > riskLimits.maxExposure) {
        return { 
          canTrade: false, 
          reason: `Trade-Wert überschreitet maximale Exposure (${riskLimits.maxExposure} USD)` 
        };
      }

      // TODO: Check current open orders count
      // This would require fetching current active orders and checking against maxOpenOrders

      return { canTrade: true };
    } catch (error) {
      console.error('Error checking trading conditions:', error);
      return { canTrade: false, reason: 'Fehler beim Prüfen der Trading-Bedingungen' };
    }
  }

  // Execute a trade with safety checks
  async executeTrade(trade: TradeOrder): Promise<{ success: boolean; order?: OrderResponse; error?: string }> {
    try {
      // Pre-trade safety checks
      const conditionsCheck = await this.checkTradingConditions(trade);
      if (!conditionsCheck.canTrade) {
        return { success: false, error: conditionsCheck.reason };
      }

      loggingService.logEvent('REAL_TRADING', 'TRADE_EXECUTION_START', {
        symbol: trade.symbol,
        side: trade.side,
        size: trade.size
      });

      // Place the order
      const order = await placeOrder(trade);

      // Start polling for order status
      this.startOrderPolling(order.orderId);

      toast({
        title: "Order platziert",
        description: `${trade.side.toUpperCase()} Order für ${trade.symbol} wurde erfolgreich platziert`,
      });

      return { success: true, order };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      loggingService.logError('TRADE_EXECUTION_FAILED', {
        symbol: trade.symbol,
        side: trade.side,
        error: errorMessage
      });

      toast({
        title: "Order-Fehler",
        description: `Fehler beim Platzieren der Order: ${errorMessage}`,
        variant: "destructive"
      });

      return { success: false, error: errorMessage };
    }
  }

  // Start polling an order for status updates
  private startOrderPolling(orderId: string) {
    // Clear existing interval if any
    const existingInterval = this.orderPollingIntervals.get(orderId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const orderStatus = await getOrderStatus(orderId);
        
        if (orderStatus.status === 'done' || orderStatus.status === 'cancelled' || orderStatus.status === 'failed') {
          // Order completed, stop polling
          clearInterval(interval);
          this.orderPollingIntervals.delete(orderId);
          
          loggingService.logEvent('REAL_TRADING', `ORDER_${orderStatus.status.toUpperCase()}`, {
            orderId,
            symbol: orderStatus.symbol,
            side: orderStatus.side,
            dealSize: orderStatus.dealSize,
            dealFunds: orderStatus.dealFunds
          });

          if (orderStatus.status === 'done') {
            toast({
              title: "Order ausgeführt",
              description: `${orderStatus.side.toUpperCase()} Order für ${orderStatus.symbol} wurde erfolgreich ausgeführt`,
            });
          } else if (orderStatus.status === 'cancelled') {
            toast({
              title: "Order storniert",
              description: `Order für ${orderStatus.symbol} wurde storniert`,
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error(`Error polling order ${orderId}:`, error);
        // Continue polling despite error
      }
    }, 5000); // Poll every 5 seconds

    this.orderPollingIntervals.set(orderId, interval);

    // Auto-cleanup after 1 hour
    setTimeout(() => {
      const interval = this.orderPollingIntervals.get(orderId);
      if (interval) {
        clearInterval(interval);
        this.orderPollingIntervals.delete(orderId);
      }
    }, 60 * 60 * 1000);
  }

  // Cancel an order
  async cancelTrade(orderId: string): Promise<boolean> {
    try {
      const success = await cancelOrder(orderId);
      
      if (success) {
        // Stop polling
        const interval = this.orderPollingIntervals.get(orderId);
        if (interval) {
          clearInterval(interval);
          this.orderPollingIntervals.delete(orderId);
        }

        toast({
          title: "Order storniert",
          description: "Die Order wurde erfolgreich storniert",
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      toast({
        title: "Stornierung fehlgeschlagen",
        description: `Fehler beim Stornieren: ${errorMessage}`,
        variant: "destructive"
      });

      return false;
    }
  }

  // Cleanup all polling intervals (call on app unmount)
  cleanup() {
    this.orderPollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.orderPollingIntervals.clear();
  }
}

// Export singleton instance
export const realTradingService = new RealTradingService();
