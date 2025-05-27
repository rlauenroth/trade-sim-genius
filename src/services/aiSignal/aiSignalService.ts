
// Main AI Signal Service orchestrator - REALISM MODE ONLY
import { testApiKey, OpenRouterError } from '@/utils/openRouter';
import { SignalGenerationParams, GeneratedSignal } from '@/types/aiSignal';
import { MarketScreeningService } from './marketScreeningService';
import { SignalAnalysisService } from './signalAnalysisService';
import { AI_SIGNAL_CONFIG, getAssetCategory } from '@/config/aiSignalConfig';
import { loggingService } from '@/services/loggingService';

export class AISignalService {
  private params: SignalGenerationParams;
  private marketScreeningService: MarketScreeningService;
  private signalAnalysisService: SignalAnalysisService;
  
  constructor(params: SignalGenerationParams) {
    this.params = params;
    this.marketScreeningService = new MarketScreeningService(params);
    this.signalAnalysisService = new SignalAnalysisService(params);
  }

  // Check if API is properly configured for real analysis
  async isApiConfigurationValid(): Promise<boolean> {
    if (!this.params.openRouterApiKey || this.params.openRouterApiKey.trim() === '') {
      loggingService.logError('OpenRouter API key validation failed', {
        reason: 'missing_api_key'
      });
      return false;
    }

    const isValidKey = await testApiKey(this.params.openRouterApiKey);
    if (!isValidKey) {
      loggingService.logError('OpenRouter API key validation failed', {
        reason: 'invalid_api_key'
      });
      return false;
    }

    loggingService.logSuccess('OpenRouter API configuration validated', {
      hasApiKey: true,
      keyValid: true
    });

    return true;
  }

  // Stage 1: Market Screening - only real data
  async performMarketScreening(): Promise<string[]> {
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('OpenRouter API configuration invalid - cannot perform real market screening');
    }
    
    try {
      return await this.marketScreeningService.performMarketScreening();
    } catch (error) {
      if (error instanceof OpenRouterError && error.status === 401) {
        throw new Error('OpenRouter API authentication failed');
      }
      throw error;
    }
  }
  
  // Stage 2: Detailed Analysis & Signal Generation - only real data
  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('OpenRouter API configuration invalid - cannot perform real signal analysis');
    }
    
    try {
      return await this.signalAnalysisService.generateDetailedSignal(assetPair);
    } catch (error) {
      if (error instanceof OpenRouterError && error.status === 401) {
        throw new Error('OpenRouter API authentication failed');
      }
      return null;
    }
  }

  // Signal diversity and selection logic
  private selectDiverseSignals(signals: GeneratedSignal[]): GeneratedSignal[] {
    loggingService.logEvent('AI', 'Selecting diverse signals', {
      totalSignals: signals.length,
      maxConcurrentTrades: AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES,
      preferDiverse: AI_SIGNAL_CONFIG.PREFER_DIVERSE_ASSETS
    });

    // Filter by minimum confidence
    const qualifiedSignals = signals.filter(signal => 
      (signal.confidenceScore || 0) >= AI_SIGNAL_CONFIG.MIN_CONFIDENCE_SCORE &&
      (signal.signalType === 'BUY' || signal.signalType === 'SELL')
    );

    loggingService.logEvent('AI', 'Signals filtered by confidence', {
      qualifiedSignals: qualifiedSignals.length,
      minConfidence: AI_SIGNAL_CONFIG.MIN_CONFIDENCE_SCORE,
      signalTypes: qualifiedSignals.map(s => ({ pair: s.assetPair, type: s.signalType, confidence: s.confidenceScore }))
    });

    if (!AI_SIGNAL_CONFIG.PREFER_DIVERSE_ASSETS) {
      // Just return top signals by confidence
      const topSignals = qualifiedSignals
        .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
        .slice(0, AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES);
      
      loggingService.logEvent('AI', 'Selected signals (confidence-only)', {
        selectedCount: topSignals.length,
        signals: topSignals.map(s => ({ pair: s.assetPair, confidence: s.confidenceScore }))
      });
      
      return topSignals;
    }

    // Implement diversity selection
    const selectedSignals: GeneratedSignal[] = [];
    const categoryCount: Record<string, number> = {};

    // Sort by confidence first
    const sortedSignals = qualifiedSignals.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

    for (const signal of sortedSignals) {
      if (selectedSignals.length >= AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES) break;

      const category = getAssetCategory(signal.assetPair);
      const currentCategoryCount = categoryCount[category] || 0;

      // Check if we can add this signal without violating diversity rules
      if (currentCategoryCount < AI_SIGNAL_CONFIG.MAX_SAME_CATEGORY_SIGNALS) {
        selectedSignals.push(signal);
        categoryCount[category] = currentCategoryCount + 1;
        
        loggingService.logEvent('AI', 'Signal selected for diversity', {
          assetPair: signal.assetPair,
          category,
          confidence: signal.confidenceScore,
          categoryCount: categoryCount[category]
        });
      } else {
        loggingService.logEvent('AI', 'Signal skipped for diversity', {
          assetPair: signal.assetPair,
          category,
          confidence: signal.confidenceScore,
          reason: 'category_limit_reached',
          currentCount: currentCategoryCount
        });
      }
    }

    // If we still have slots and haven't filled them, fill with best remaining signals
    if (selectedSignals.length < AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES) {
      const remainingSlots = AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES - selectedSignals.length;
      const remainingSignals = sortedSignals.filter(signal => 
        !selectedSignals.some(selected => selected.assetPair === signal.assetPair)
      ).slice(0, remainingSlots);

      selectedSignals.push(...remainingSignals);
      
      loggingService.logEvent('AI', 'Filled remaining slots', {
        remainingSlots,
        filledWith: remainingSignals.length,
        totalSelected: selectedSignals.length
      });
    }

    loggingService.logSuccess('Signal selection completed', {
      totalGenerated: signals.length,
      qualified: qualifiedSignals.length,
      selected: selectedSignals.length,
      categoryDistribution: categoryCount,
      selectedPairs: selectedSignals.map(s => s.assetPair)
    });

    return selectedSignals;
  }
  
  // Generate signals for multiple assets - REAL ANALYSIS ONLY
  async generateSignals(): Promise<GeneratedSignal[]> {
    loggingService.logEvent('AI', 'Starting comprehensive signal generation', {
      strategy: this.params.strategy,
      portfolioValue: this.params.simulatedPortfolioValue,
      availableUSDT: this.params.availableUSDT,
      maxSignals: AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES
    });
    
    // Validate API configuration first
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('Cannot generate signals: OpenRouter API not properly configured');
    }
    
    // Stage 1: Market Screening
    const selectedPairs = await this.performMarketScreening();
    
    loggingService.logEvent('AI', 'Market screening completed, starting detailed analysis', {
      selectedPairs,
      pairCount: selectedPairs.length
    });
    
    // Stage 2: Generate detailed signals for all selected pairs
    const signals: GeneratedSignal[] = [];
    
    for (let i = 0; i < selectedPairs.length; i++) {
      const pair = selectedPairs[i];
      
      loggingService.logEvent('AI', 'Processing pair for detailed analysis', {
        pair,
        index: i + 1,
        total: selectedPairs.length
      });
      
      try {
        const signal = await this.generateDetailedSignal(pair);
        if (signal) {
          signals.push(signal);
          
          loggingService.logEvent('AI', 'Signal generated for pair', {
            pair,
            signalType: signal.signalType,
            confidence: signal.confidenceScore
          });
        } else {
          loggingService.logEvent('AI', 'No signal generated for pair', {
            pair,
            reason: 'analysis_returned_null'
          });
        }
      } catch (error) {
        loggingService.logError('Signal generation failed for pair', {
          pair,
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < selectedPairs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, AI_SIGNAL_CONFIG.REQUEST_DELAY_MS));
      }
    }
    
    loggingService.logEvent('AI', 'All detailed analysis completed', {
      totalPairs: selectedPairs.length,
      signalsGenerated: signals.length,
      signalTypes: signals.map(s => ({ pair: s.assetPair, type: s.signalType }))
    });
    
    // Stage 3: Select diverse signals based on configuration
    const selectedSignals = this.selectDiverseSignals(signals);
    
    loggingService.logSuccess('Signal generation process completed', {
      totalAnalyzed: selectedPairs.length,
      signalsGenerated: signals.length,
      signalsSelected: selectedSignals.length,
      finalSignals: selectedSignals.map(s => ({
        pair: s.assetPair,
        type: s.signalType,
        confidence: s.confidenceScore,
        category: getAssetCategory(s.assetPair)
      }))
    });
    
    return selectedSignals;
  }
}
