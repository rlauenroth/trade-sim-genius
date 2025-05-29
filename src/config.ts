
export const KUCOIN_PROXY_BASE = 'https://t3h.online/kucoin-proxy.php?path=';

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
  
  // Refresh from localStorage - try V2 settings first
  try {
    // Try V2 settings first
    const v2Settings = localStorage.getItem('kiTradingApp_settingsV2');
    if (v2Settings) {
      const parsed = JSON.parse(v2Settings);
      if (parsed.kucoin && parsed.kucoin.key && parsed.kucoin.secret && parsed.kucoin.passphrase) {
        const keys = {
          apiKey: parsed.kucoin.key,
          secret: parsed.kucoin.secret,
          passphrase: parsed.kucoin.passphrase
        };
        
        // Update cache
        apiKeyCache = {
          keys,
          timestamp: now
        };
        
        console.log('✅ API keys loaded successfully from V2 settings');
        return keys;
      }
    }
    
    // Fallback to old format
    const stored = localStorage.getItem('kiTradingApp_apiKeys');
    if (stored) {
      const parsed = JSON.parse(stored);
      let keys;
      
      // Handle new nested format
      if (parsed.kucoin && typeof parsed.kucoin === 'object') {
        keys = {
          apiKey: parsed.kucoin.key,
          secret: parsed.kucoin.secret,
          passphrase: parsed.kucoin.passphrase
        };
      } 
      // Handle old flat format (for backward compatibility)
      else if (parsed.kucoinApiKey) {
        keys = {
          apiKey: parsed.kucoinApiKey,
          secret: parsed.kucoinApiSecret,
          passphrase: parsed.kucoinApiPassphrase
        };
      }
      
      // Only cache if we have valid keys
      if (keys && keys.apiKey && keys.secret && keys.passphrase) {
        // Update cache
        apiKeyCache = {
          keys,
          timestamp: now
        };
        
        console.log('✅ API keys loaded successfully from legacy storage');
        return keys;
      }
    }
  } catch (error) {
    console.error('Error reading API keys from storage:', error);
  }
  
  console.warn('⚠️ No valid API keys found in storage');
  return null;
};

// Migration helper for old proxy URLs
export const migrateProxyUrl = (currentUrl: string): string => {
  const oldUrls = [
    'https://astra1623.startdedicated.de/images/kucoin-proxy.php?path=',
    'https://astra1623.startdedicated.de/images/kucoin-proxy.php'
  ];
  
  if (oldUrls.some(oldUrl => currentUrl.includes('astra1623.startdedicated.de'))) {
    console.log('🔄 Migrating old proxy URL to new one');
    return KUCOIN_PROXY_BASE;
  }
  
  return currentUrl;
};
