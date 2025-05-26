
// AI Signal Generation Service with Demo Mode Support
import { sendAIRequest, createScreeningPrompt, createAnalysisPrompt, testApiKey, OpenRouterError } from '@/utils/openRouterApi';
import { getMarketTickers, getHistoricalCandles, getCurrentPrice } from '@/utils/kucoinApi';
import { calculateAllIndicators } from '@/utils/technicalIndicators';

interface KuCoinCredentials {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
}

interface SignalGenerationParams {
  kucoinCredentials: KuCoinCredentials;
  openRouterApiKey: string;
  strategy: string;
  simulatedPortfolioValue: number;
  availableUSDT: number;
}

interface GeneratedSignal {
  assetPair: string;
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  entryPriceSuggestion: string | number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidenceScore?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
  isDemoMode?: boolean;
}

export class AISignalService {
  private params: SignalGenerationParams;
  private isDemoMode: boolean = false;
  
  constructor(params: SignalGenerationParams) {
    this.params = params;
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

  // Generate demo signals without API calls
  generateDemoSignals(): GeneratedSignal[] {
    const demoSignals: GeneratedSignal[] = [
      {
        assetPair: 'BTC-USDT',
        signalType: 'BUY',
        entryPriceSuggestion: 'MARKET',
        takeProfitPrice: 62000,
        stopLossPrice: 59500,
        confidenceScore: 0.75,
        reasoning: 'Demo-Signal: RSI zeigt überverkauft, MACD bullisches Momentum, Preis prallt von Support ab',
        suggestedPositionSizePercent: 5,
        isDemoMode: true
      },
      {
        assetPair: 'ETH-USDT',
        signalType: 'BUY',
        entryPriceSuggestion: 'MARKET',
        takeProfitPrice: 3200,
        stopLossPrice: 2950,
        confidenceScore: 0.68,
        reasoning: 'Demo-Signal: Durchbruch über Widerstand bei 3050, hohe Volumen-Bestätigung',
        suggestedPositionSizePercent: 3,
        isDemoMode: true
      },
      {
        assetPair: 'SOL-USDT',
        signalType: 'BUY',
        entryPriceSuggestion: 'MARKET',
        takeProfitPrice: 160,
        stopLossPrice: 145,
        confidenceScore: 0.72,
        reasoning: 'Demo-Signal: Starke Aufwärtsbewegung, hohe Aktivität im Solana-Ökosystem',
        suggestedPositionSizePercent: 4,
        isDemoMode: true
      }
    ];

    // Return random signal
    const randomSignal = demoSignals[Math.floor(Math.random() * demoSignals.length)];
    return [randomSignal];
  }

  // Stage 1: Market Screening with demo mode support
  async performMarketScreening(): Promise<string[]> {
    console.log('🔍 Starting market screening...');
    
    // Check if we should use demo mode
    this.isDemoMode = await this.shouldUseDemoMode();
    
    if (this.isDemoMode) {
      console.log('📊 Market screening in demo mode');
      return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
    }
    
    try {
      // Get market data from KuCoin
      const tickers = await getMarketTickers(this.params.kucoinCredentials);
      
      // Filter for USDT pairs and sort by volume
      const usdtPairs = tickers
        .filter(ticker => ticker.symbol.endsWith('-USDT'))
        .filter(ticker => parseFloat(ticker.volValue) > 100000)
        .sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue))
        .slice(0, 50);
      
      // Prepare data for AI screening
      const marketData = usdtPairs.map(ticker => ({
        pair: ticker.symbol,
        price: parseFloat(ticker.last),
        change_24h: parseFloat(ticker.changeRate) * 100,
        volume_24h: parseFloat(ticker.volValue),
        high_24h: parseFloat(ticker.high),
        low_24h: parseFloat(ticker.low)
      }));
      
      // Send to AI for screening
      const screeningPrompt = createScreeningPrompt(this.params.strategy, marketData);
      const aiResponse = await sendAIRequest(this.params.openRouterApiKey, screeningPrompt);
      
      // Parse AI response
      const parsed = JSON.parse(aiResponse);
      console.log('📊 Market screening completed:', parsed.selected_pairs);
      
      return parsed.selected_pairs || [];
      
    } catch (error) {
      console.error('❌ Market screening failed:', error);
      if (error instanceof OpenRouterError && error.status === 401) {
        console.log('🔄 Switching to demo mode due to authentication error');
        this.isDemoMode = true;
        return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
      }
      // Fallback to popular pairs
      return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
    }
  }
  
  // Stage 2: Detailed Analysis & Signal Generation with demo mode
  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    console.log(`🤖 Generating detailed signal for ${assetPair}...`);
    
    if (this.isDemoMode) {
      console.log(`📊 Generating demo signal for ${assetPair}`);
      const demoSignals = this.generateDemoSignals();
      if (demoSignals.length > 0) {
        const signal = { ...demoSignals[0], assetPair };
        return signal;
      }
      return null;
    }
    
    try {
      // Get historical data
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (24 * 60 * 60);
      
      const candles = await getHistoricalCandles(
        this.params.kucoinCredentials,
        assetPair,
        '5min',
        startTime,
        endTime
      );
      
      if (candles.length === 0) {
        console.log(`⚠️ No candle data for ${assetPair}`);
        return null;
      }
      
      // Convert candle data for technical indicators
      const candleData = candles.map(candle => ({
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume)
      }));
      
      // Calculate technical indicators
      const technicalIndicators = calculateAllIndicators(candleData);
      
      // Get current price
      const currentPrice = await getCurrentPrice(this.params.kucoinCredentials, assetPair);
      
      // Prepare data for AI analysis
      const marketData = {
        asset_pair: assetPair,
        current_price: currentPrice,
        recent_candles: candleData.slice(-20),
        price_trend_1h: this.calculatePriceTrend(candleData.slice(-12)),
        price_trend_4h: this.calculatePriceTrend(candleData.slice(-48)),
        volume_average: candleData.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20
      };
      
      const portfolioData = {
        total_simulated_value_usdt: this.params.simulatedPortfolioValue,
        available_usdt: this.params.availableUSDT,
        strategy: this.params.strategy
      };
      
      // Generate analysis prompt
      const analysisPrompt = createAnalysisPrompt(
        this.params.strategy,
        assetPair,
        marketData,
        technicalIndicators,
        portfolioData
      );
      
      // Send to AI for detailed analysis
      const aiResponse = await sendAIRequest(this.params.openRouterApiKey, analysisPrompt);
      const signal = JSON.parse(aiResponse);
      
      console.log(`✅ Signal generated for ${assetPair}:`, signal.signal_type);
      
      return {
        assetPair: signal.asset_pair,
        signalType: signal.signal_type,
        entryPriceSuggestion: signal.entry_price_suggestion,
        takeProfitPrice: signal.take_profit_price || 0,
        stopLossPrice: signal.stop_loss_price || 0,
        confidenceScore: signal.confidence_score,
        reasoning: signal.reasoning,
        suggestedPositionSizePercent: signal.suggested_position_size_percent,
        isDemoMode: false
      };
      
    } catch (error) {
      console.error(`❌ Signal generation failed for ${assetPair}:`, error);
      if (error instanceof OpenRouterError && error.status === 401) {
        console.log('🔄 Switching to demo mode due to authentication error');
        this.isDemoMode = true;
        const demoSignals = this.generateDemoSignals();
        if (demoSignals.length > 0) {
          return { ...demoSignals[0], assetPair };
        }
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
      return this.generateDemoSignals();
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
  
  // Helper method to calculate price trend
  private calculatePriceTrend(candles: any[]): number {
    if (candles.length < 2) return 0;
    
    const firstPrice = candles[0].close;
    const lastPrice = candles[candles.length - 1].close;
    
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }
}
