
// Main AI Signal Service orchestrator - REALISM MODE ONLY
import { testApiKey, OpenRouterError } from '@/utils/openRouter';
import { SignalGenerationParams, GeneratedSignal } from '@/types/aiSignal';
import { MarketScreeningService } from './marketScreeningService';
import { SignalAnalysisService } from './signalAnalysisService';

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
      console.log('❌ No OpenRouter API key provided');
      return false;
    }

    const isValidKey = await testApiKey(this.params.openRouterApiKey);
    if (!isValidKey) {
      console.log('❌ Invalid OpenRouter API key');
      return false;
    }

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
  
  // Generate signals for multiple assets - REAL ANALYSIS ONLY
  async generateSignals(): Promise<GeneratedSignal[]> {
    console.log('🚀 Starting real AI signal generation process...');
    
    // Validate API configuration first
    const isValid = await this.isApiConfigurationValid();
    if (!isValid) {
      throw new Error('Cannot generate signals: OpenRouter API not properly configured');
    }
    
    // Stage 1: Market Screening
    const selectedPairs = await this.performMarketScreening();
    console.log('📊 Market screening completed, analyzing pairs:', selectedPairs);
    
    // Stage 2: Generate detailed signals
    const signals: GeneratedSignal[] = [];
    
    for (const pair of selectedPairs) {
      const signal = await this.generateDetailedSignal(pair);
      if (signal) {
        signals.push(signal);
        
        // Only return the first tradeable signal
        if (signal.signalType === 'BUY' || signal.signalType === 'SELL') {
          break;
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return signals;
  }
}
