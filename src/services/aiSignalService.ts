// AI Signal Generation Service
import { sendAIRequest, createScreeningPrompt, createAnalysisPrompt } from '@/utils/openRouterApi';
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
}

export class AISignalService {
  private params: SignalGenerationParams;
  
  constructor(params: SignalGenerationParams) {
    this.params = params;
  }
  
  // Stage 1: Market Screening
  async performMarketScreening(): Promise<string[]> {
    console.log('🔍 Starting market screening...');
    
    try {
      // Get market data from KuCoin
      const tickers = await getMarketTickers(this.params.kucoinCredentials);
      
      // Filter for USDT pairs and sort by volume
      const usdtPairs = tickers
        .filter(ticker => ticker.symbol.endsWith('-USDT'))
        .filter(ticker => parseFloat(ticker.volValue) > 100000) // Minimum volume filter
        .sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue))
        .slice(0, 50); // Top 50 by volume
      
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
      // Fallback to popular pairs
      return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
    }
  }
  
  // Stage 2: Detailed Analysis & Signal Generation
  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    console.log(`🤖 Generating detailed signal for ${assetPair}...`);
    
    try {
      // Get historical data
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (24 * 60 * 60); // Last 24 hours
      
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
        recent_candles: candleData.slice(-20), // Last 20 candles
        price_trend_1h: this.calculatePriceTrend(candleData.slice(-12)), // Last hour (5min * 12)
        price_trend_4h: this.calculatePriceTrend(candleData.slice(-48)), // Last 4 hours
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
        suggestedPositionSizePercent: signal.suggested_position_size_percent
      };
      
    } catch (error) {
      console.error(`❌ Signal generation failed for ${assetPair}:`, error);
      return null;
    }
  }
  
  // Generate signals for multiple assets
  async generateSignals(): Promise<GeneratedSignal[]> {
    console.log('🚀 Starting AI signal generation process...');
    
    // Stage 1: Market Screening
    const selectedPairs = await this.performMarketScreening();
    
    // Stage 2: Generate detailed signals
    const signals: GeneratedSignal[] = [];
    
    for (const pair of selectedPairs) {
      const signal = await this.generateDetailedSignal(pair);
      if (signal) {
        signals.push(signal);
        
        // Only return the first tradeable signal to avoid overwhelming the user
        if (signal.signalType === 'BUY' || signal.signalType === 'SELL') {
          break;
        }
      }
      
      // Small delay between requests to respect rate limits
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
