
import { loggingService } from './loggingService';

interface SlippageConfig {
  baseSlippageBps: number; // Base slippage in basis points (1 bp = 0.01%)
  volumeImpactThreshold: number; // Order value threshold for volume impact
  maxSlippageBps: number; // Maximum slippage cap
  enabled: boolean;
}

interface SlippageResult {
  originalPrice: number;
  adjustedPrice: number;
  slippageBps: number;
  slippageAmount: number;
}

interface OrderbookData {
  bestBid: number;
  bestAsk: number;
  spread: number;
  volume24h?: number;
}

export class SlippageService {
  private static instance: SlippageService;
  
  private slippageConfigs: Map<string, SlippageConfig> = new Map([
    ['conservative', {
      baseSlippageBps: 2, // 0.02%
      volumeImpactThreshold: 1000, // $1000
      maxSlippageBps: 10, // 0.1%
      enabled: true
    }],
    ['balanced', {
      baseSlippageBps: 3, // 0.03%
      volumeImpactThreshold: 500, // $500
      maxSlippageBps: 15, // 0.15%
      enabled: true
    }],
    ['aggressive', {
      baseSlippageBps: 5, // 0.05%
      volumeImpactThreshold: 200, // $200
      maxSlippageBps: 25, // 0.25%
      enabled: true
    }]
  ]);

  static getInstance(): SlippageService {
    if (!SlippageService.instance) {
      SlippageService.instance = new SlippageService();
    }
    return SlippageService.instance;
  }

  calculateSlippage(
    orderType: 'BUY' | 'SELL',
    orderValue: number,
    orderbookData: OrderbookData,
    strategy: string = 'balanced'
  ): SlippageResult {
    const config = this.slippageConfigs.get(strategy) || this.slippageConfigs.get('balanced')!;
    
    if (!config.enabled) {
      const originalPrice = orderType === 'BUY' ? orderbookData.bestAsk : orderbookData.bestBid;
      return {
        originalPrice,
        adjustedPrice: originalPrice,
        slippageBps: 0,
        slippageAmount: 0
      };
    }

    const originalPrice = orderType === 'BUY' ? orderbookData.bestAsk : orderbookData.bestBid;
    const spreadBps = (orderbookData.spread / originalPrice) * 10000; // Convert to basis points
    
    // Calculate slippage components
    let slippageBps = config.baseSlippageBps;
    
    // Add spread-based slippage (wider spreads = more slippage)
    slippageBps += Math.min(spreadBps * 0.5, config.maxSlippageBps * 0.3);
    
    // Add volume impact (larger orders = more slippage)
    if (orderValue > config.volumeImpactThreshold) {
      const volumeMultiplier = Math.min(
        orderValue / config.volumeImpactThreshold,
        3 // Cap at 3x
      );
      slippageBps += config.baseSlippageBps * (volumeMultiplier - 1) * 0.5;
    }
    
    // Cap slippage
    slippageBps = Math.min(slippageBps, config.maxSlippageBps);
    
    // Apply slippage (negative for seller, positive for buyer in terms of getting worse price)
    const slippageMultiplier = slippageBps / 10000;
    let adjustedPrice: number;
    
    if (orderType === 'BUY') {
      // Buyer pays more (worse price)
      adjustedPrice = originalPrice * (1 + slippageMultiplier);
    } else {
      // Seller receives less (worse price)
      adjustedPrice = originalPrice * (1 - slippageMultiplier);
    }
    
    const slippageAmount = Math.abs(adjustedPrice - originalPrice);
    
    loggingService.logEvent('TRADE', 'Slippage calculated', {
      orderType,
      orderValue,
      strategy,
      originalPrice,
      adjustedPrice,
      slippageBps: Math.round(slippageBps * 100) / 100,
      spreadBps: Math.round(spreadBps * 100) / 100,
      slippageAmount
    });
    
    return {
      originalPrice,
      adjustedPrice,
      slippageBps,
      slippageAmount
    };
  }

  // Enable/disable slippage for a strategy
  setSlippageEnabled(strategy: string, enabled: boolean): void {
    const config = this.slippageConfigs.get(strategy);
    if (config) {
      config.enabled = enabled;
      loggingService.logEvent('SYSTEM', `Slippage ${enabled ? 'enabled' : 'disabled'} for strategy ${strategy}`);
    }
  }

  // Update slippage configuration
  updateSlippageConfig(strategy: string, updates: Partial<SlippageConfig>): void {
    const config = this.slippageConfigs.get(strategy);
    if (config) {
      Object.assign(config, updates);
      loggingService.logEvent('SYSTEM', `Slippage config updated for strategy ${strategy}`, updates);
    }
  }

  getSlippageConfig(strategy: string): SlippageConfig | undefined {
    return this.slippageConfigs.get(strategy);
  }
}

export const slippageService = SlippageService.getInstance();
