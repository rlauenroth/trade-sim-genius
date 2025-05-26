
// Main AI Signal Service orchestrator
import { testApiKey, OpenRouterError } from '@/utils/openRouter';
import { SignalGenerationParams, GeneratedSignal } from '@/types/aiSignal';
import { DemoSignalGenerator } from './demoSignalGenerator';
import { MarketScreeningService } from './marketScreeningService';
import { SignalAnalysisService } from './signalAnalysisService';

export class AISignalService {
  private params: SignalGenerationParams;
  private isDemoMode: boolean = false;
  private marketScreeningService: MarketScreeningService;
  private signalAnalysisService: SignalAnalysisService;
  
  constructor(params: SignalGenerationParams) {
    this.params = params;
    this.marketScreeningService = new MarketScreeningService(params);
    this.signalAnalysisService = new SignalAnalysisService(params);
  }

  // Check if we should use demo mode
  async shouldUseDemoMode(): Promise<boolean> {
    if (!this.params.openRouterApiKey || this.params.openRouterApiKey.trim() === '') {
      console.log('🔄 No OpenRouter API key provided, using demo mode');
      return true;
    }

    const isValidKey = await testApiKey(this.params.openRouterApiKey);
    if (!isValidKey) {
      console.log('🔄 Invalid OpenRouter API key, switching to demo mode');
      return true;
    }

    return false;
  }

  // Stage 1: Market Screening with demo mode support
  async performMarketScreening(): Promise<string[]> {
    // Check if we should use demo mode
    this.isDemoMode = await this.shouldUseDemoMode();
    
    if (this.isDemoMode) {
      console.log('📊 Market screening in demo mode');
      return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
    }
    
    try {
      return await this.marketScreeningService.performMarketScreening();
    } catch (error) {
      if (error instanceof OpenRouterError && error.status === 401) {
        console.log('🔄 Switching to demo mode due to authentication error');
        this.isDemoMode = true;
        return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
      }
      throw error;
    }
  }
  
  // Stage 2: Detailed Analysis & Signal Generation with demo mode
  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    if (this.isDemoMode) {
      console.log(`📊 Generating demo signal for ${assetPair}`);
      return DemoSignalGenerator.generateDemoSignalForPair(assetPair);
    }
    
    try {
      return await this.signalAnalysisService.generateDetailedSignal(assetPair);
    } catch (error) {
      if (error instanceof OpenRouterError && error.status === 401) {
        console.log('🔄 Switching to demo mode due to authentication error');
        this.isDemoMode = true;
        return DemoSignalGenerator.generateDemoSignalForPair(assetPair);
      }
      return null;
    }
  }
  
  // Generate signals for multiple assets
  async generateSignals(): Promise<GeneratedSignal[]> {
    console.log('🚀 Starting AI signal generation process...');
    
    // Stage 1: Market Screening
    const selectedPairs = await this.performMarketScreening();
    
    if (this.isDemoMode) {
      console.log('📊 Running in demo mode, generating demo signals');
      return DemoSignalGenerator.generateDemoSignals();
    }
    
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
