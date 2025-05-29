
import { calculateAllIndicators, CandleData } from '@/utils/technicalIndicators';
import { loggingService } from '@/services/loggingService';

export interface TechnicalSignal {
  asset_pair: string;
  signal_type: 'BUY' | 'SELL' | 'HOLD';
  entry_price_suggestion: string | number;
  take_profit_price: number;
  stop_loss_price: number;
  confidence_score: number;
  reasoning: string;
  suggested_position_size_percent: number;
}

export class TechnicalRulesFallback {
  private static instance: TechnicalRulesFallback;
  
  static getInstance(): TechnicalRulesFallback {
    if (!TechnicalRulesFallback.instance) {
      TechnicalRulesFallback.instance = new TechnicalRulesFallback();
    }
    return TechnicalRulesFallback.instance;
  }

  generateTechnicalSignal(assetPair: string, candleData: CandleData[], currentPrice: number): TechnicalSignal {
    loggingService.logEvent('AI', 'Generating technical rules fallback signal', {
      assetPair,
      candleCount: candleData.length,
      currentPrice
    });

    try {
      const indicators = calculateAllIndicators(candleData);
      const signal = this.analyzeWithTechnicalRules(assetPair, indicators, currentPrice);
      
      loggingService.logEvent('AI', 'Technical fallback signal generated', {
        assetPair,
        signalType: signal.signal_type,
        confidence: signal.confidence_score,
        reasoning: signal.reasoning
      });

      return signal;
    } catch (error) {
      loggingService.logError('Technical rules fallback failed', {
        assetPair,
        error: error instanceof Error ? error.message : 'unknown'
      });

      return this.getSafeHoldSignal(assetPair, currentPrice);
    }
  }

  private analyzeWithTechnicalRules(assetPair: string, indicators: any, currentPrice: number): TechnicalSignal {
    const signals: Array<{ type: 'BUY' | 'SELL' | 'HOLD'; weight: number; reason: string }> = [];

    // RSI Analysis
    if (indicators.rsi) {
      const rsi = indicators.rsi[indicators.rsi.length - 1];
      if (rsi < 30) {
        signals.push({ type: 'BUY', weight: 0.8, reason: 'RSI oversold' });
      } else if (rsi > 70) {
        signals.push({ type: 'SELL', weight: 0.8, reason: 'RSI overbought' });
      } else {
        signals.push({ type: 'HOLD', weight: 0.3, reason: 'RSI neutral' });
      }
    }

    // MACD Analysis
    if (indicators.macd) {
      const macd = indicators.macd[indicators.macd.length - 1];
      const signal = indicators.macdSignal[indicators.macdSignal.length - 1];
      
      if (macd > signal && macd > 0) {
        signals.push({ type: 'BUY', weight: 0.6, reason: 'MACD bullish' });
      } else if (macd < signal && macd < 0) {
        signals.push({ type: 'SELL', weight: 0.6, reason: 'MACD bearish' });
      }
    }

    // Moving Average Analysis
    if (indicators.sma20 && indicators.sma50) {
      const sma20 = indicators.sma20[indicators.sma20.length - 1];
      const sma50 = indicators.sma50[indicators.sma50.length - 1];
      
      if (currentPrice > sma20 && sma20 > sma50) {
        signals.push({ type: 'BUY', weight: 0.5, reason: 'Above moving averages' });
      } else if (currentPrice < sma20 && sma20 < sma50) {
        signals.push({ type: 'SELL', weight: 0.5, reason: 'Below moving averages' });
      }
    }

    // Volume Analysis
    if (indicators.volume) {
      const recentVolume = indicators.volume.slice(-5);
      const avgVolume = recentVolume.reduce((sum, v) => sum + v, 0) / recentVolume.length;
      const currentVolume = indicators.volume[indicators.volume.length - 1];
      
      if (currentVolume > avgVolume * 1.5) {
        // High volume - strengthen existing signals
        signals.forEach(signal => {
          if (signal.type !== 'HOLD') {
            signal.weight *= 1.2;
            signal.reason += ' + high volume';
          }
        });
      }
    }

    // Calculate final signal
    const signalWeights = { BUY: 0, SELL: 0, HOLD: 0 };
    const reasons: string[] = [];

    signals.forEach(signal => {
      signalWeights[signal.type] += signal.weight;
      reasons.push(signal.reason);
    });

    // Determine final signal
    let finalSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let maxWeight = signalWeights.HOLD;
    let confidence = 0.4; // Conservative confidence for technical analysis

    if (signalWeights.BUY > maxWeight && signalWeights.BUY > 1.0) {
      finalSignal = 'BUY';
      confidence = Math.min(0.7, 0.4 + (signalWeights.BUY - 1.0) * 0.2);
    } else if (signalWeights.SELL > maxWeight && signalWeights.SELL > 1.0) {
      finalSignal = 'SELL';
      confidence = Math.min(0.7, 0.4 + (signalWeights.SELL - 1.0) * 0.2);
    }

    // Calculate stop loss and take profit
    const stopLossPercent = 0.05; // 5%
    const takeProfitPercent = 0.1; // 10%
    
    let stopLossPrice = 0;
    let takeProfitPrice = 0;
    
    if (finalSignal === 'BUY') {
      stopLossPrice = currentPrice * (1 - stopLossPercent);
      takeProfitPrice = currentPrice * (1 + takeProfitPercent);
    } else if (finalSignal === 'SELL') {
      stopLossPrice = currentPrice * (1 + stopLossPercent);
      takeProfitPrice = currentPrice * (1 - takeProfitPercent);
    }

    return {
      asset_pair: assetPair,
      signal_type: finalSignal,
      entry_price_suggestion: 'MARKET',
      take_profit_price: takeProfitPrice,
      stop_loss_price: stopLossPrice,
      confidence_score: confidence,
      reasoning: `Technical analysis: ${reasons.join(', ')}`,
      suggested_position_size_percent: finalSignal === 'HOLD' ? 0 : 0.05 // Conservative 5%
    };
  }

  private getSafeHoldSignal(assetPair: string, currentPrice: number): TechnicalSignal {
    return {
      asset_pair: assetPair,
      signal_type: 'HOLD',
      entry_price_suggestion: 'MARKET',
      take_profit_price: 0,
      stop_loss_price: 0,
      confidence_score: 0.1,
      reasoning: 'System protection mode - technical analysis failed',
      suggested_position_size_percent: 0
    };
  }

  generateExitSignal(assetPair: string, position: any, candleData: CandleData[], currentPrice: number): 'SELL' | 'HOLD' {
    try {
      const indicators = calculateAllIndicators(candleData);
      
      // Calculate current P&L
      const entryPrice = position.entryPrice;
      const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      // Hard stop loss/take profit rules
      if (position.type === 'BUY') {
        if (pnlPercent <= -5) return 'SELL'; // 5% stop loss
        if (pnlPercent >= 10) return 'SELL'; // 10% take profit
      } else if (position.type === 'SELL') {
        if (pnlPercent >= 5) return 'SELL'; // 5% stop loss (for short)
        if (pnlPercent <= -10) return 'SELL'; // 10% take profit (for short)
      }

      // Technical exit signals
      if (indicators.rsi) {
        const rsi = indicators.rsi[indicators.rsi.length - 1];
        if (position.type === 'BUY' && rsi > 80) return 'SELL'; // Very overbought
        if (position.type === 'SELL' && rsi < 20) return 'SELL'; // Very oversold
      }

      return 'HOLD';
    } catch (error) {
      loggingService.logError('Technical exit analysis failed', {
        assetPair,
        error: error instanceof Error ? error.message : 'unknown'
      });
      return 'HOLD';
    }
  }
}

export const technicalRulesFallback = TechnicalRulesFallback.getInstance();
