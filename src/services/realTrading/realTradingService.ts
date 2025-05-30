
import { TradeOrder, OrderResponse, RiskLimits } from '@/types/appState';
import { createOrder, getAllOrders } from '@/utils/kucoin/trading';
import { loggingService } from '@/services/loggingService';
import { ApiKeys } from './types';
import { ConfigService } from './configService';
import { RiskManagementService } from './riskManagementService';
import { OrderMonitoringService } from './orderMonitoringService';

class RealTradingService {
  private apiKeys: ApiKeys | null = null;
  private riskLimits: RiskLimits = {
    maxOpenOrders: 5,
    maxExposure: 1000,
    minBalance: 50,
    requireConfirmation: true
  };

  private configService = ConfigService.getInstance();
  private riskService = RiskManagementService.getInstance();
  private monitoringService = OrderMonitoringService.getInstance();

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
    const { apiKeys: storeApiKeys, riskLimits: storeRiskLimits } = this.configService.getSettingsFromStore();
    
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
      const riskCheckResult = await this.riskService.performEnhancedPreTradeChecks(trade, apiKeysToUse, riskLimitsToUse);
      
      if (!riskCheckResult.passed) {
        throw new Error(`Risk check failed: ${riskCheckResult.errors.join(', ')}`);
      }

      // Convert API keys format
      const credentials = this.configService.convertApiKeys(apiKeysToUse);

      // Execute the trade
      console.log('Executing real trade:', trade);
      loggingService.logEvent('TRADE', `Executing real trade: ${trade.side} ${trade.size} ${trade.symbol}`);

      const orderResponse = await createOrder(credentials, trade);
      
      if (orderResponse) {
        loggingService.logSuccess(`Real trade executed successfully. Order ID: ${orderResponse.orderId}`);
        
        // Start order status monitoring
        this.monitoringService.startOrderMonitoring(credentials, orderResponse.orderId);
        
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

  async getOpenOrders(): Promise<OrderResponse[]> {
    if (!this.apiKeys) {
      const error = new Error('API keys not configured');
      loggingService.logError('Failed to get open orders - no API keys');
      throw error;
    }

    try {
      const credentials = this.configService.convertApiKeys(this.apiKeys);
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
      
      // Stop monitoring the canceled order
      this.monitoringService.stopOrderMonitoring(orderId);
      
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
    return this.configService.validateConfiguration(this.apiKeys, this.riskLimits);
  }
}

export const realTradingService = new RealTradingService();
