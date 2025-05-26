
// OpenRouter prompt generation functions
import { OpenRouterRequest } from '@/types/openRouter';
import { DEFAULT_MODELS, STRATEGY_CONFIGS } from './config';

// Generate market screening prompt
export function createScreeningPrompt(
  strategy: string,
  marketData: any[]
): OpenRouterRequest {
  const strategyContext = {
    conservative: 'Konservativ: Fokus auf stabile Trends, geringe Volatilität, etablierte Coins',
    balanced: 'Ausgewogen: Balance zwischen Stabilität und Wachstumspotenzial, moderate Volatilität',
    aggressive: 'Aggressiv: Fokus auf hohes Momentum, Ausbruchspotenzial, höhere Volatilität'
  }[strategy] || 'Ausgewogen';

  return {
    model: DEFAULT_MODELS.screening,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein erfahrener Krypto-Marktanalyst für schnelle Markt-Scans. Antworte nur mit gültigem JSON.'
      },
      {
        role: 'user',
        content: `Analysiere die folgenden KuCoin-Handelspaare und deren Marktdaten.
Strategie: ${strategyContext}

Marktdaten:
${JSON.stringify(marketData, null, 2)}

Identifiziere die Top 3-5 Handelspaare mit dem höchsten Potenzial für profitable Trades in den nächsten Stunden.

Antwort-Format:
{
  "selected_pairs": ["BTC-USDT", "ETH-USDT", "SOL-USDT"],
  "reasoning": "Kurze Begründung für die Auswahl"
}`
      }
    ],
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  };
}

export function createAnalysisPrompt(
  strategy: string,
  assetPair: string,
  marketData: any,
  technicalIndicators: any,
  portfolioData: any
): OpenRouterRequest {
  const strategyDetails = STRATEGY_CONFIGS[strategy as keyof typeof STRATEGY_CONFIGS] || STRATEGY_CONFIGS.balanced;

  return {
    model: DEFAULT_MODELS.analysis,
    messages: [
      {
        role: 'system',
        content: `Du bist ein präziser Krypto-Trading-Signal-Generator. Analysiere die Daten und erstelle ein umsetzbares Handelssignal im JSON-Format.

Strategie: ${strategyDetails.description}
- Take-Profit Ziel: ${strategyDetails.targetPercent}
- Stop-Loss Limit: ${strategyDetails.stopPercent}
- Empfohlene Positionsgröße: ${strategyDetails.positionSize} des Portfolios`
      },
      {
        role: 'user',
        content: `Analysiere ${assetPair} für ein Handelssignal:

Marktdaten:
${JSON.stringify(marketData, null, 2)}

Technische Indikatoren:
${JSON.stringify(technicalIndicators, null, 2)}

Portfolio-Info:
${JSON.stringify(portfolioData, null, 2)}

Erstelle ein Handelssignal im folgenden JSON-Format:
{
  "asset_pair": "${assetPair}",
  "signal_type": "BUY|SELL|HOLD|NO_TRADE",
  "entry_price_suggestion": "MARKET oder spezifischer Preis",
  "take_profit_price": 0.0,
  "stop_loss_price": 0.0,
  "confidence_score": 0.75,
  "reasoning": "Detaillierte Begründung",
  "suggested_position_size_percent": 3.0
}`
      }
    ],
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  };
}
