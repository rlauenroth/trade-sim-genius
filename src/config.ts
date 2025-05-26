
export const KUCOIN_PROXY_BASE = '/images/kucoin-proxy.php?path=';

// Memory cache for API keys with TTL
interface ApiKeyCache {
  keys: {
    apiKey: string;
    secret: string;
    passphrase: string;
  } | null;
  timestamp: number;
}

let apiKeyCache: ApiKeyCache = {
  keys: null,
  timestamp: 0
};

const API_KEY_TTL = 15 * 60 * 1000; // 15 minutes

export const getStoredKeys = () => {
  const now = Date.now();
  
  // Check if cache is valid
  if (apiKeyCache.keys && (now - apiKeyCache.timestamp) < API_KEY_TTL) {
    return apiKeyCache.keys;
  }
  
  // Refresh from localStorage
  try {
    const stored = localStorage.getItem('kiTradingApp_apiKeys');
    if (stored) {
      const parsed = JSON.parse(stored);
      const keys = {
        apiKey: parsed.kucoinApiKey,
        secret: parsed.kucoinApiSecret,
        passphrase: parsed.kucoinApiPassphrase
      };
      
      // Update cache
      apiKeyCache = {
        keys,
        timestamp: now
      };
      
      return keys;
    }
  } catch (error) {
    console.error('Error reading API keys from storage:', error);
  }
  
  return null;
};
