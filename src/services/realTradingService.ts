
import { ApiKeys, TradeOrder, OrderResponse, RiskLimits } from '@/types/appState';
import { createOrder, getOrderStatus, getAllOrders } from '@/utils/kucoin/trading';
import { addLogEntry } from '@/hooks/useActivityLog';

interface KuCoinCredentials {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
}

// Convert ApiKeys to KuCoinCredentials format
const convertApiKeys = (apiKeys: ApiKeys): KuCoinCredentials => ({
  kucoinApiKey: apiKeys.kucoin.key,
  kucoinApiSecret: apiKeys.kucoin.secret,
  kucoinApiPassphrase: apiKeys.kucoin.passphrase
});

class RealTradingService {
  private apiKeys: ApiKeys | null = null;
  private riskLimits: RiskLimits = {
    maxOpenOrders: 5,
    maxExposure: 1000,
    minBalance: 50,
    requireConfirmation: true
  };

  setApiKeys(keys: ApiKeys) {
    this.apiKeys = keys;
  }

  setRiskLimits(limits: RiskLimits) {
    this.riskLimits = limits;
  }

  async executeRealTrade(trade: TradeOrder): Promise<OrderResponse | null> {
    if (!this.apiKeys) {
      throw new Error('API keys not configured for real trading');
    }

    try {
      // Pre-trade risk checks
      await this.performPreTradeChecks(trade);

      // Convert API keys format
      const credentials = convertApiKeys(this.apiKeys);

      // Execute the trade
      console.log('Executing real trade:', trade);
      addLogEntry('INFO', `Executing real trade: ${trade.side} ${trade.size} ${trade.symbol}`);

      const orderResponse = await createOrder(credentials, trade);
      
      if (orderResponse) {
        addLogEntry('SUCCESS', `Real trade executed successfully. Order ID: ${orderResponse.orderId}`);
        
        // Start order status monitoring
        this.monitorOrderStatus(credentials, orderResponse.orderId);
        
        return orderResponse;
      } else {
        throw new Error('Order creation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Real trade execution failed:', error);
      addLogEntry('ERROR', `Real trade failed: ${errorMessage}`);
      throw error;
    }
  }

  private async performPreTradeChecks(trade: TradeOrder): Promise<void> {
    // Check account balance
    // Check risk limits
    // Validate trade parameters
    console.log('Performing pre-trade checks for:', trade);
    
    // Mock implementation - in real app, check actual account balance and limits
    const estimatedValue = parseFloat(trade.size) * (parseFloat(trade.price || '0') || 1);
    
    if (estimatedValue > this.riskLimits.maxExposure) {
      throw new Error(`Trade value (${estimatedValue}) exceeds maximum exposure limit (${this.riskLimits.maxExposure})`);
    }
  }

  private async monitorOrderStatus(credentials: KuCoinCredentials, orderId: string): Promise<void> {
    const checkStatus = async () => {
      try {
        const status = await getOrderStatus(credentials, orderId);
        console.log(`Order ${orderId} status:`, status);
        
        if (status?.status === 'done') {
          addLogEntry('SUCCESS', `Order ${orderId} completed successfully`);
        } else if (status?.status === 'cancelled' || status?.status === 'failed') {
          addLogEntry('ERROR', `Order ${orderId} ${status.status}`);
        } else {
          // Continue monitoring
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Error checking order status:', error);
        addLogEntry('ERROR', `Failed to check order status: ${orderId}`);
      }
    };

    // Start monitoring
    setTimeout(checkStatus, 2000);
  }

  async getOpenOrders(): Promise<OrderResponse[]> {
    if (!this.apiKeys) {
      throw new Error('API keys not configured');
    }

    try {
      const credentials = convertApiKeys(this.apiKeys);
      const orders = await getAllOrders(credentials, 'active');
      return orders || [];
    } catch (error) {
      console.error('Error fetching open orders:', error);
      return [];
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.apiKeys) {
      throw new Error('API keys not configured');
    }

    try {
      // Implementation for canceling orders would go here
      console.log('Canceling order:', orderId);
      addLogEntry('INFO', `Canceling order: ${orderId}`);
      return true;
    } catch (error) {
      console.error('Error canceling order:', error);
      addLogEntry('ERROR', `Failed to cancel order: ${orderId}`);
      return false;
    }
  }
}

export const realTradingService = new RealTradingService();
