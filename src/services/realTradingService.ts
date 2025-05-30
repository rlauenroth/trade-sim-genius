import { TradeOrder, OrderResponse, RiskLimits } from '@/types/appState';
import { createOrder, getOrderStatus, getAllOrders, getAccountBalances } from '@/utils/kucoin/trading';
import { loggingService } from '@/services/loggingService';
import { useSettingsV2Store } from '@/stores/settingsV2';

interface ApiKeys {
  kucoin: {
    key: string;
    secret: string;
    passphrase: string;
  };
  openRouter: {
    apiKey: string;
  };
}

// KuCoin credentials type for trading operations
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

  // New method to retrieve settings from the centralized store
  private getSettingsFromStore(): { apiKeys: ApiKeys, riskLimits: RiskLimits } {
    try {
      const { settings } = useSettingsV2Store.getState();
      
      const apiKeys: ApiKeys = {
        kucoin: {
          key: settings.kucoin.key,
          secret: settings.kucoin.secret,
          passphrase: settings.kucoin.passphrase
        },
        openRouter: {
          apiKey: settings.openRouter.apiKey
        }
      };
      
      const riskLimits: RiskLimits = settings.riskLimits;
      
      return { apiKeys, riskLimits };
    } catch (error) {
      loggingService.logError('Failed to get settings from store', { 
        error: error instanceof Error ? error.message : 'unknown' 
      });
      return { 
        apiKeys: this.apiKeys || { kucoin: { key: '', secret: '', passphrase: '' }, openRouter: { apiKey: '' } },
        riskLimits: this.riskLimits
      };
    }
  }

  // Set API keys (for backward compatibility)
  setApiKeys(keys: ApiKeys) {
    try {
      if (!keys || !keys.kucoin || !keys.kucoin.key || !keys.kucoin.secret || !keys.kucoin.passphrase) {
        throw new Error('Invalid API keys provided');
      }
      
      this.apiKeys = keys;
      loggingService.logEvent('TRADE', 'API keys set for real trading');
    } catch (error) {
      loggingService.logError('Failed to set API keys', { error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  // Set risk limits (for backward compatibility)
  setRiskLimits(limits: RiskLimits) {
    try {
      if (!limits || typeof limits.maxOpenOrders !== 'number' || typeof limits.maxExposure !== 'number') {
        throw new Error('Invalid risk limits provided');
      }
      
      this.riskLimits = {
        maxOpenOrders: Math.max(1, limits.maxOpenOrders),
        maxExposure: Math.max(100, limits.maxExposure),
        minBalance: Math.max(10, limits.minBalance),
        requireConfirmation: limits.requireConfirmation ?? true
      };
      
      loggingService.logEvent('TRADE', 'Risk limits updated', { riskLimits: this.riskLimits });
    } catch (error) {
      loggingService.logError('Failed to set risk limits', { error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  async executeRealTrade(trade: TradeOrder): Promise<OrderResponse | null> {
    // Get fresh settings from the store
    const { apiKeys: storeApiKeys, riskLimits: storeRiskLimits } = this.getSettingsFromStore();
    
    // Use stored api keys as a fallback only if not available in the store
    const apiKeysToUse = storeApiKeys.kucoin.key ? storeApiKeys : this.apiKeys;
    const riskLimitsToUse = storeRiskLimits.maxOpenOrders ? storeRiskLimits : this.riskLimits;
    
    if (!apiKeysToUse) {
      const error = new Error('API keys not configured for real trading');
      loggingService.logError('Real trade execution failed - no API keys');
      throw error;
    }

    try {
      // Enhanced pre-trade risk checks with real API data
      await this.performEnhancedPreTradeChecks(trade, apiKeysToUse, riskLimitsToUse);

      // Convert API keys format
      const credentials = convertApiKeys(apiKeysToUse);

      // Execute the trade
      console.log('Executing real trade:', trade);
      loggingService.logEvent('TRADE', `Executing real trade: ${trade.side} ${trade.size} ${trade.symbol}`);

      const orderResponse = await createOrder(credentials, trade);
      
      if (orderResponse) {
        loggingService.logSuccess(`Real trade executed successfully. Order ID: ${orderResponse.orderId}`);
        
        // Start order status monitoring
        this.monitorOrderStatus(credentials, orderResponse.orderId);
        
        return orderResponse;
      } else {
        throw new Error('Order creation failed - no response from exchange');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Real trade execution failed:', error);
      loggingService.logError(`Real trade failed: ${errorMessage}`, {
        trade,
        riskLimits: riskLimitsToUse
      });
      throw error;
    }
  }

  private async performEnhancedPreTradeChecks(
    trade: TradeOrder, 
    apiKeys: ApiKeys, 
    riskLimits: RiskLimits
  ): Promise<void> {
    try {
      console.log('Performing enhanced pre-trade checks for:', trade);
      
      if (!trade.size || !trade.symbol) {
        throw new Error('Invalid trade parameters - missing size or symbol');
      }

      const credentials = convertApiKeys(apiKeys);

      // Get real account balances
      const balances = await getAccountBalances(credentials);
      const usdtBalance = balances.find(b => b.currency === 'USDT');
      const availableUSDT = parseFloat(usdtBalance?.available || '0');

      loggingService.logEvent('TRADE', 'Real account balance retrieved', {
        availableUSDT,
        minBalanceRequired: riskLimits.minBalance
      });

      // Check minimum balance requirement
      if (availableUSDT < riskLimits.minBalance) {
        throw new Error(`Insufficient balance. Available: $${availableUSDT.toFixed(2)}, minimum required: $${riskLimits.minBalance}`);
      }

      // Get current open orders
      const openOrders = await getAllOrders(credentials, 'active');
      const currentOpenOrdersCount = openOrders.length;

      loggingService.logEvent('TRADE', 'Current open orders retrieved', {
        openOrdersCount: currentOpenOrdersCount,
        maxAllowed: riskLimits.maxOpenOrders
      });

      // Check max open orders limit
      if (currentOpenOrdersCount >= riskLimits.maxOpenOrders) {
        throw new Error(`Maximum open orders limit reached. Current: ${currentOpenOrdersCount}, maximum allowed: ${riskLimits.maxOpenOrders}`);
      }

      // Calculate total exposure from existing orders
      const totalCurrentExposure = openOrders.reduce((total, order) => {
        const orderValue = parseFloat(order.size) * parseFloat(order.price || '0');
        return total + orderValue;
      }, 0);

      // Calculate estimated trade value
      const estimatedTradeValue = parseFloat(trade.size) * (parseFloat(trade.price || '0') || 1);

      // Check total exposure limit
      const newTotalExposure = totalCurrentExposure + estimatedTradeValue;
      if (newTotalExposure > riskLimits.maxExposure) {
        throw new Error(`Total exposure limit exceeded. Current: $${totalCurrentExposure.toFixed(2)}, new trade: $${estimatedTradeValue.toFixed(2)}, total would be: $${newTotalExposure.toFixed(2)}, maximum allowed: $${riskLimits.maxExposure}`);
      }

      // Check if sufficient balance for trade
      if (estimatedTradeValue > availableUSDT) {
        throw new Error(`Insufficient balance for trade. Required: $${estimatedTradeValue.toFixed(2)}, available: $${availableUSDT.toFixed(2)}`);
      }

      // Minimum trade value check
      if (estimatedTradeValue < 10) {
        throw new Error('Trade value too small - minimum $10 required');
      }

      loggingService.logEvent('TRADE', 'Enhanced pre-trade checks passed', {
        estimatedTradeValue,
        totalCurrentExposure,
        newTotalExposure,
        availableUSDT,
        currentOpenOrders: currentOpenOrdersCount,
        limits: riskLimits
      });
    } catch (error) {
      loggingService.logError('Enhanced pre-trade checks failed', {
        error: error instanceof Error ? error.message : 'unknown',
        trade
      });
      throw error;
    }
  }

  private async monitorOrderStatus(credentials: KuCoinCredentials, orderId: string): Promise<void> {
    const checkStatus = async () => {
      try {
        const status = await getOrderStatus(credentials, orderId);
        console.log(`Order ${orderId} status:`, status);
        
        if (status?.status === 'done') {
          loggingService.logSuccess(`Order ${orderId} completed successfully`);
        } else if (status?.status === 'cancelled' || status?.status === 'failed') {
          loggingService.logError(`Order ${orderId} ${status.status}`);
        } else {
          // Continue monitoring for up to 5 minutes
          const orderAge = Date.now() - parseInt(orderId.substring(0, 13));
          if (orderAge < 300000) { // 5 minutes
            setTimeout(checkStatus, 5000);
          } else {
            loggingService.logEvent('TRADE', `Order monitoring timeout for ${orderId}`);
          }
        }
      } catch (error) {
        console.error('Error checking order status:', error);
        loggingService.logError(`Failed to check order status: ${orderId}`, {
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
    };

    // Start monitoring
    setTimeout(checkStatus, 2000);
  }

  async getOpenOrders(): Promise<OrderResponse[]> {
    if (!this.apiKeys) {
      const error = new Error('API keys not configured');
      loggingService.logError('Failed to get open orders - no API keys');
      throw error;
    }

    try {
      const credentials = convertApiKeys(this.apiKeys);
      const orders = await getAllOrders(credentials, 'active');
      return orders || [];
    } catch (error) {
      console.error('Error fetching open orders:', error);
      loggingService.logError('Failed to fetch open orders', {
        error: error instanceof Error ? error.message : 'unknown'
      });
      return [];
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.apiKeys) {
      const error = new Error('API keys not configured');
      loggingService.logError('Failed to cancel order - no API keys');
      throw error;
    }

    try {
      // Implementation for canceling orders would go here
      console.log('Canceling order:', orderId);
      loggingService.logEvent('TRADE', `Canceling order: ${orderId}`);
      return true;
    } catch (error) {
      console.error('Error canceling order:', error);
      loggingService.logError(`Failed to cancel order: ${orderId}`, {
        error: error instanceof Error ? error.message : 'unknown'
      });
      return false;
    }
  }

  // Public method to validate configuration
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.apiKeys) {
      errors.push('API keys not configured');
    } else {
      if (!this.apiKeys.kucoin?.key) errors.push('KuCoin API key missing');
      if (!this.apiKeys.kucoin?.secret) errors.push('KuCoin API secret missing');
      if (!this.apiKeys.kucoin?.passphrase) errors.push('KuCoin API passphrase missing');
    }
    
    if (!this.riskLimits || typeof this.riskLimits.maxOpenOrders !== 'number') {
      errors.push('Risk limits not properly configured');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const realTradingService = new RealTradingService();
