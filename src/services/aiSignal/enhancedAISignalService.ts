
import { SignalGenerationParams, GeneratedSignal } from '@/types/aiSignal';
import { EnhancedMarketScreeningService } from './enhancedMarketScreeningService';
import { EnhancedSignalAnalysisService } from './enhancedSignalAnalysisService';
import { SignalValidator } from './components/signalValidator';
import { SignalSelector } from './components/signalSelector';
import { AI_SIGNAL_CONFIG, getAssetCategory } from '@/config/aiSignalConfig';
import { loggingService } from '@/services/loggingService';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';

export class EnhancedAISignalService {
  private params: SignalGenerationParams;
  private marketScreeningService: EnhancedMarketScreeningService;
  private signalAnalysisService: EnhancedSignalAnalysisService;
  private signalValidator: SignalValidator;
  private signalSelector: SignalSelector;
  
  constructor(params: SignalGenerationParams) {
    this.params = params;
    this.marketScreeningService = new EnhancedMarketScreeningService(params);
    this.signalAnalysisService = new EnhancedSignalAnalysisService(params);
    this.signalValidator = new SignalValidator();
    this.signalSelector = new SignalSelector();
  }

  async isApiConfigurationValid(): Promise<boolean> {
    return await this.signalValidator.validateApiConfiguration(this.params.openRouterApiKey);
  }

  async performMarketScreening(): Promise<string[]> {
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('OpenRouter API configuration invalid - cannot perform real market screening');
    }
    
    return await this.marketScreeningService.performMarketScreening();
  }
  
  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    return await this.signalAnalysisService.generateDetailedSignal(assetPair);
  }

  async generateDetailedSignalWithCallback(
    assetPair: string, 
    candidateStatusCallback: (symbol: string, status: string) => void
  ): Promise<GeneratedSignal | null> {
    const enhancedAnalysisService = new EnhancedSignalAnalysisService(this.params, candidateStatusCallback);
    return await enhancedAnalysisService.generateDetailedSignal(assetPair);
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
    const signals = await this.generateSignalsForPairs(selectedPairs);
    
    // Stage 3: Enhanced diverse signal selection
    const selectedSignals = this.signalSelector.selectDiverseSignals(signals);
    
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

  private async generateSignalsForPairs(selectedPairs: string[]): Promise<GeneratedSignal[]> {
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
    
    return signals;
  }
}
