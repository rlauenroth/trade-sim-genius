
// Demo signal generation service
import { GeneratedSignal } from '@/types/aiSignal';

export class DemoSignalGenerator {
  private static demoSignals: GeneratedSignal[] = [
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

  static generateDemoSignals(): GeneratedSignal[] {
    const randomSignal = this.demoSignals[Math.floor(Math.random() * this.demoSignals.length)];
    return [randomSignal];
  }

  static generateDemoSignalForPair(assetPair: string): GeneratedSignal | null {
    const demoSignals = this.generateDemoSignals();
    if (demoSignals.length > 0) {
      return { ...demoSignals[0], assetPair };
    }
    return null;
  }
}
