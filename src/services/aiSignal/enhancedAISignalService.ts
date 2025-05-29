
import { testApiKey, OpenRouterError } from '@/utils/openRouter';
import { SignalGenerationParams, GeneratedSignal } from '@/types/aiSignal';
import { EnhancedMarketScreeningService } from './enhancedMarketScreeningService';
import { EnhancedSignalAnalysisService } from './enhancedSignalAnalysisService';
import { AI_SIGNAL_CONFIG, getAssetCategory } from '@/config/aiSignalConfig';
import { loggingService } from '@/services/loggingService';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';

export class EnhancedAISignalService {
  private params: SignalGenerationParams;
  private marketScreeningService: EnhancedMarketScreeningService;
  private signalAnalysisService: EnhancedSignalAnalysisService;
  
  constructor(params: SignalGenerationParams) {
    this.params = params;
    this.marketScreeningService = new EnhancedMarketScreeningService(params);
    this.signalAnalysisService = new EnhancedSignalAnalysisService(params);
  }

  async isApiConfigurationValid(): Promise<boolean> {
    if (!this.params.openRouterApiKey || this.params.openRouterApiKey.trim() === '') {
      loggingService.logError('OpenRouter API key validation failed', {
        reason: 'missing_api_key'
      });
      return false;
    }

    const isValidKey = await testApiKey(this.params.openRouterApiKey);
    if (!isValidKey) {
      candidateErrorManager.recordError('api_validation', 'AUTH_FAIL');
      loggingService.logError('OpenRouter API key validation failed', {
        reason: 'invalid_api_key'
      });
      return false;
    }

    candidateErrorManager.recordSuccess('api_validation');
    loggingService.logSuccess('OpenRouter API configuration validated', {
      hasApiKey: true,
      keyValid: true
    });

    return true;
  }

  async performMarketScreening(): Promise<string[]> {
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('OpenRouter API configuration invalid - cannot perform real market screening');
    }
    
    try {
      return await this.marketScreeningService.performMarketScreening();
    } catch (error) {
      if (error instanceof OpenRouterError && error.status === 401) {
        candidateErrorManager.recordError('screening', 'AUTH_FAIL');
        throw new Error('OpenRouter API authentication failed');
      }
      throw error;
    }
  }
  
  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('OpenRouter API configuration invalid - cannot perform real signal analysis');
    }
    
    try {
      return await this.signalAnalysisService.generateDetailedSignal(assetPair);
    } catch (error) {
      if (error instanceof OpenRouterError && error.status === 401) {
        candidateErrorManager.recordError(assetPair, 'AUTH_FAIL');
        throw new Error('OpenRouter API authentication failed');
      }
      return null;
    }
  }

  private selectDiverseSignals(signals: GeneratedSignal[]): GeneratedSignal[] {
    loggingService.logEvent('AI', 'Selecting diverse signals', {
      totalSignals: signals.length,
      maxConcurrentTrades: AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES,
      preferDiverse: AI_SIGNAL_CONFIG.PREFER_DIVERSE_ASSETS
    });

    const qualifiedSignals = signals.filter(signal => 
      (signal.confidenceScore || 0) >= AI_SIGNAL_CONFIG.MIN_CONFIDENCE_SCORE &&
      (signal.signalType === 'BUY' || signal.signalType === 'SELL') &&
      !candidateErrorManager.isBlacklisted(signal.assetPair)
    );

    loggingService.logEvent('AI', 'Signals filtered by confidence and blacklist', {
      qualifiedSignals: qualifiedSignals.length,
      minConfidence: AI_SIGNAL_CONFIG.MIN_CONFIDENCE_SCORE,
      blacklistedCount: signals.length - qualifiedSignals.length
    });

    if (!AI_SIGNAL_CONFIG.PREFER_DIVERSE_ASSETS) {
      return qualifiedSignals
        .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
        .slice(0, AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES);
    }

    // Implement diversity selection with blacklist awareness
    const selectedSignals: GeneratedSignal[] = [];
    const categoryCount: Record<string, number> = {};

    const sortedSignals = qualifiedSignals.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

    for (const signal of sortedSignals) {
      if (selectedSignals.length >= AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES) break;

      const category = getAssetCategory(signal.assetPair);
      const currentCategoryCount = categoryCount[category] || 0;

      if (currentCategoryCount < AI_SIGNAL_CONFIG.MAX_SAME_CATEGORY_SIGNALS) {
        selectedSignals.push(signal);
        categoryCount[category] = currentCategoryCount + 1;
      }
    }

    // Fill remaining slots if needed
    if (selectedSignals.length < AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES) {
      const remainingSlots = AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES - selectedSignals.length;
      const remainingSignals = sortedSignals.filter(signal => 
        !selectedSignals.some(selected => selected.assetPair === signal.assetPair)
      ).slice(0, remainingSlots);

      selectedSignals.push(...remainingSignals);
    }

    loggingService.logSuccess('Enhanced signal selection completed', {
      totalGenerated: signals.length,
      qualified: qualifiedSignals.length,
      selected: selectedSignals.length,
      categoryDistribution: categoryCount,
      selectedPairs: selectedSignals.map(s => s.assetPair)
    });

    return selectedSignals;
  }
  
  async generateSignals(): Promise<GeneratedSignal[]> {
    loggingService.logEvent('AI', 'Starting enhanced comprehensive signal generation', {
      strategy: this.params.strategy,
      portfolioValue: this.params.simulatedPortfolioValue,
      availableUSDT: this.params.availableUSDT,
      maxSignals: AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES
    });
    
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('Cannot generate signals: OpenRouter API not properly configured');
    }
    
    // Stage 1: Enhanced Market Screening
    const selectedPairs = await this.performMarketScreening();
    
    loggingService.logEvent('AI', 'Enhanced market screening completed', {
      selectedPairs,
      pairCount: selectedPairs.length
    });
    
    // Stage 2: Enhanced detailed signal generation
    const signals: GeneratedSignal[] = [];
    
    for (let i = 0; i < selectedPairs.length; i++) {
      const pair = selectedPairs[i];
      
      // Skip blacklisted pairs
      if (candidateErrorManager.isBlacklisted(pair)) {
        loggingService.logEvent('AI', 'Skipping blacklisted pair', { pair });
        continue;
      }
      
      loggingService.logEvent('AI', 'Processing pair with enhanced analysis', {
        pair,
        index: i + 1,
        total: selectedPairs.length
      });
      
      try {
        const signal = await this.generateDetailedSignal(pair);
        if (signal) {
          signals.push(signal);
        }
      } catch (error) {
        loggingService.logError('Enhanced signal generation failed for pair', {
          pair,
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
      
      // Respect rate limits with enhanced delay
      if (i < selectedPairs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, AI_SIGNAL_CONFIG.REQUEST_DELAY_MS));
      }
    }
    
    // Stage 3: Enhanced diverse signal selection
    const selectedSignals = this.selectDiverseSignals(signals);
    
    loggingService.logSuccess('Enhanced signal generation process completed', {
      totalAnalyzed: selectedPairs.length,
      signalsGenerated: signals.length,
      signalsSelected: selectedSignals.length,
      healthMetrics: candidateErrorManager.getHealthMetrics(),
      finalSignals: selectedSignals.map(s => ({
        pair: s.assetPair,
        type: s.signalType,
        confidence: s.confidenceScore,
        category: getAssetCategory(s.assetPair),
        isDemoMode: s.isDemoMode
      }))
    });
    
    return selectedSignals;
  }
}
