
// OpenRouter API configuration

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
  'X-Title': 'KI Trading Assistant'
};

// Fallback model for error handling only
export const FALLBACK_MODEL_ID = 'mistralai/mistral-7b-instruct';

export const STRATEGY_CONFIGS = {
  conservative: {
    description: 'Konservativ: Kapitalerhalt, geringes Risiko, klare Trends, enge Stops',
    targetPercent: '1-2%',
    stopPercent: '0.5-1%',
    positionSize: '2%'
  },
  balanced: {
    description: 'Ausgewogen: Balance zwischen Sicherheit und Rendite, moderate Risiken',
    targetPercent: '2-5%',
    stopPercent: '1-2%',
    positionSize: '3-5%'
  },
  aggressive: {
    description: 'Aggressiv: Hohe Rendite-Chancen, höhere Risiken, schnelle Bewegungen',
    targetPercent: '5-10%',
    stopPercent: '2-4%',
    positionSize: '5-8%'
  }
};
