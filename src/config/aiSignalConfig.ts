
// AI Signal Generation Configuration
export const AI_SIGNAL_CONFIG = {
  // Market screening configuration
  SCREENING_TOP_X: 10,
  SCREENING_MIN_VOLUME: 100000,
  
  // Signal generation configuration
  MAX_CONCURRENT_TRADES: 3,
  MIN_CONFIDENCE_SCORE: 0.6,
  
  // Request timing configuration
  REQUEST_DELAY_MS: 1000,
  MAX_RETRIES: 2,
  
  // Signal diversity configuration
  PREFER_DIVERSE_ASSETS: true,
  MAX_SAME_CATEGORY_SIGNALS: 2
};

export const ASSET_CATEGORIES = {
  'BTC': 'major',
  'ETH': 'major', 
  'BNB': 'exchange',
  'SOL': 'layer1',
  'ADA': 'layer1',
  'DOT': 'layer1',
  'MATIC': 'layer2',
  'AVAX': 'layer1',
  'LINK': 'oracle',
  'UNI': 'defi'
} as const;

export function getAssetCategory(symbol: string): string {
  const baseAsset = symbol.replace('-USDT', '');
  return ASSET_CATEGORIES[baseAsset as keyof typeof ASSET_CATEGORIES] || 'other';
}
