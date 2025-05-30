
import { TradeOrder, RiskLimits } from '@/types/appState';
import { ApiKeys, KuCoinCredentials, RiskCheckResult, PreTradeData } from './types';
import { getAccountBalances, getAllOrders } from '@/utils/kucoin/trading';
import { loggingService } from '@/services/loggingService';

export class RiskManagementService {
  private static instance: RiskManagementService;
  
  static getInstance(): RiskManagementService {
    if (!RiskManagementService.instance) {
      RiskManagementService.instance = new RiskManagementService();
    }
    return RiskManagementService.instance;
  }

  async performEnhancedPreTradeChecks(
    trade: TradeOrder, 
    apiKeys: ApiKeys, 
    riskLimits: RiskLimits
  ): Promise<RiskCheckResult> {
    try {
      console.log('Performing enhanced pre-trade checks for:', trade);
      
      if (!trade.size || !trade.symbol) {
        return {
          passed: false,
          errors: ['Invalid trade parameters - missing size or symbol']
        };
      }

      const credentials: KuCoinCredentials = {
        kucoinApiKey: apiKeys.kucoin.key,
        kucoinApiSecret: apiKeys.kucoin.secret,
        kucoinApiPassphrase: apiKeys.kucoin.passphrase
      };

      const preTradeData = await this.gatherPreTradeData(credentials, trade);
      return this.validateTradeAgainstLimits(preTradeData, riskLimits);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'unknown';
      loggingService.logError('Enhanced pre-trade checks failed', {
        error: errorMessage,
        trade
      });
      return {
        passed: false,
        errors: [errorMessage]
      };
    }
  }

  private async gatherPreTradeData(credentials: KuCoinCredentials, trade: TradeOrder): Promise<PreTradeData> {
    // Get real account balances
    const balances = await getAccountBalances(credentials);
    const usdtBalance = balances.find(b => b.currency === 'USDT');
    const availableUSDT = parseFloat(usdtBalance?.available || '0');

    loggingService.logEvent('TRADE', 'Real account balance retrieved', {
      availableUSDT
    });

    // Get current open orders
    const openOrders = await getAllOrders(credentials, 'active');
    const currentOpenOrdersCount = openOrders.length;

    loggingService.logEvent('TRADE', 'Current open orders retrieved', {
      openOrdersCount: currentOpenOrdersCount
    });

    // Calculate total exposure from existing orders
    const totalCurrentExposure = openOrders.reduce((total, order) => {
      const orderValue = parseFloat(order.size) * parseFloat(order.price || '0');
      return total + orderValue;
    }, 0);

    // Calculate estimated trade value
    const estimatedTradeValue = parseFloat(trade.size) * (parseFloat(trade.price || '0') || 1);

    return {
      availableUSDT,
      currentOpenOrders: currentOpenOrdersCount,
      totalCurrentExposure,
      estimatedTradeValue
    };
  }

  private validateTradeAgainstLimits(preTradeData: PreTradeData, riskLimits: RiskLimits): RiskCheckResult {
    const errors: string[] = [];
    const { availableUSDT, currentOpenOrders, totalCurrentExposure, estimatedTradeValue } = preTradeData;

    // Check minimum balance requirement
    if (availableUSDT < riskLimits.minBalance) {
      errors.push(`Insufficient balance. Available: $${availableUSDT.toFixed(2)}, minimum required: $${riskLimits.minBalance}`);
    }

    // Check max open orders limit
    if (currentOpenOrders >= riskLimits.maxOpenOrders) {
      errors.push(`Maximum open orders limit reached. Current: ${currentOpenOrders}, maximum allowed: ${riskLimits.maxOpenOrders}`);
    }

    // Check total exposure limit
    const newTotalExposure = totalCurrentExposure + estimatedTradeValue;
    if (newTotalExposure > riskLimits.maxExposure) {
      errors.push(`Total exposure limit exceeded. Current: $${totalCurrentExposure.toFixed(2)}, new trade: $${estimatedTradeValue.toFixed(2)}, total would be: $${newTotalExposure.toFixed(2)}, maximum allowed: $${riskLimits.maxExposure}`);
    }

    // Check if sufficient balance for trade
    if (estimatedTradeValue > availableUSDT) {
      errors.push(`Insufficient balance for trade. Required: $${estimatedTradeValue.toFixed(2)}, available: $${availableUSDT.toFixed(2)}`);
    }

    // Minimum trade value check
    if (estimatedTradeValue < 10) {
      errors.push('Trade value too small - minimum $10 required');
    }

    if (errors.length === 0) {
      loggingService.logEvent('TRADE', 'Enhanced pre-trade checks passed', {
        estimatedTradeValue,
        totalCurrentExposure,
        newTotalExposure,
        availableUSDT,
        currentOpenOrders,
        limits: riskLimits
      });
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }
}
