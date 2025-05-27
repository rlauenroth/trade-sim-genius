
// Market screening service
import { sendAIRequest, createScreeningPrompt, OpenRouterError } from '@/utils/openRouter';
import { getMarketTickers } from '@/utils/kucoinApi';
import { SignalGenerationParams, MarketDataPoint } from '@/types/aiSignal';
import { safeJsonParse } from '@/utils/aiResponseValidator';

export class MarketScreeningService {
  private params: SignalGenerationParams;

  constructor(params: SignalGenerationParams) {
    this.params = params;
  }

  async performMarketScreening(): Promise<string[]> {
    console.log('🔍 Starting market screening...');
    
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
      const marketData: MarketDataPoint[] = usdtPairs.map(ticker => ({
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
      
      console.log('Raw AI screening response:', aiResponse);
      
      // Parse AI response with validation
      const fallbackResponse = { selected_pairs: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'] };
      const parsed = safeJsonParse(aiResponse, fallbackResponse);
      
      console.log('📊 Market screening completed:', parsed.selected_pairs);
      
      return parsed.selected_pairs || ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
      
    } catch (error) {
      console.error('❌ Market screening failed:', error);
      if (error instanceof OpenRouterError && error.status === 401) {
        console.log('🔄 Switching to demo mode due to authentication error');
        throw error; // Re-throw to let the main service handle demo mode
      }
      // Fallback to popular pairs
      return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
    }
  }
}
