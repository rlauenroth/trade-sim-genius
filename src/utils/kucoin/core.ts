
import { KUCOIN_PROXY_BASE } from '@/config';
import { 
  RateLimitError, 
  ProxyError, 
  ApiError 
} from '../errors';
import { networkStatusService } from '@/services/networkStatusService';
import { loggingService } from '@/services/loggingService';
import { createAuthHeaders } from './auth';
import { parseKuCoinError } from './errorHandler';
import { ActivityLogger } from './types';
import { useSettingsV2Store } from '@/stores/settingsV2';

// Global activity logger - will be set by the component that uses this
let globalActivityLogger: ActivityLogger | null = null;

export function setActivityLogger(logger: ActivityLogger | null) {
  globalActivityLogger = logger;
}

// Interface for API keys to be passed explicitly
interface KuCoinApiKeys {
  apiKey: string;
  secret: string;
  passphrase: string;
}

// Helper function to get the configured proxy URL dynamically
function getProxyBaseUrl(): string {
  try {
    const { settings } = useSettingsV2Store.getState();
    const configuredProxy = settings.proxyUrl;
    
    // Use configured proxy URL if available, otherwise fallback to default
    const actualProxy = configuredProxy || KUCOIN_PROXY_BASE;
    
    console.log('🔗 Dynamic proxy URL usage:', actualProxy, configuredProxy ? '(configured)' : '(default)');
    return actualProxy;
  } catch (error) {
    console.warn('⚠️ Could not get proxy URL from settings, using default:', error);
    return KUCOIN_PROXY_BASE;
  }
}

// Helper function to get API keys from the centralized store
function getApiKeysFromStore(): KuCoinApiKeys | null {
  try {
    const { settings } = useSettingsV2Store.getState();
    
    if (settings.kucoin.key && settings.kucoin.secret && settings.kucoin.passphrase) {
      console.log('🔑 Retrieved API keys from settings store');
      return {
        apiKey: settings.kucoin.key,
        secret: settings.kucoin.secret,
        passphrase: settings.kucoin.passphrase
      };
    }
    
    console.warn('⚠️ No valid API keys found in settings store');
    return null;
  } catch (error) {
    console.error('Error getting API keys from store:', error);
    return null;
  }
}

// Helper function to get temporary keys during verification ONLY
function getTempKeysForVerification(): KuCoinApiKeys | null {
  try {
    const tempKeys = localStorage.getItem('temp_kucoin_keys');
    if (tempKeys) {
      const parsed = JSON.parse(tempKeys);
      console.log('🔑 Retrieved temp keys for verification:', { 
        hasApiKey: !!parsed.apiKey, 
        hasSecret: !!parsed.secret, 
        hasPassphrase: !!parsed.passphrase 
      });
      
      // Validate that all required fields are present and not empty
      if (!parsed.apiKey || !parsed.secret || !parsed.passphrase) {
        console.error('❌ Temp keys validation failed:', {
          apiKey: parsed.apiKey ? 'present' : 'missing',
          secret: parsed.secret ? 'present' : 'missing', 
          passphrase: parsed.passphrase ? 'present' : 'missing'
        });
        return null;
      }
      
      // Return keys with correct field names for auth functions
      return {
        apiKey: parsed.apiKey,
        secret: parsed.secret,
        passphrase: parsed.passphrase
      };
    }
  } catch (error) {
    console.warn('Could not parse temp keys for verification:', error);
  }
  return null;
}

export async function kucoinFetch(
  path: string,
  method = 'GET',
  query: Record<string, string | number | undefined> = {},
  body?: unknown,
  apiKeys?: KuCoinApiKeys // Optional parameter, will use store if not provided
) {
  const startTime = Date.now();
  
  // Get the dynamic proxy base URL
  const proxyBaseUrl = getProxyBaseUrl();
  
  // Use provided keys or get from store or temp keys for verification
  let keys = apiKeys;
  if (!keys) {
    // First try to get from settings store
    keys = getApiKeysFromStore();
    
    // If not found, try temp keys for verification scenarios
    if (!keys) {
      keys = getTempKeysForVerification();
      if (keys) {
        console.log('🔑 Using temp keys for verification scenario');
      }
    }
  }
  
  // Log API call start
  loggingService.logEvent('API', `CALL ${method} ${path}`, {
    endpoint: path,
    method,
    query,
    body: body ? JSON.stringify(body) : undefined,
    hasKeys: !!keys,
    usingTempKeys: !apiKeys && !!keys,
    proxyUrl: proxyBaseUrl
  });
  
  if (!keys) {
    const error = new ProxyError('No API keys available - please configure API keys in settings or use temp keys for verification');
    const duration = Date.now() - startTime;
    
    loggingService.logError(`API FAIL ${method} ${path}`, {
      endpoint: path,
      method,
      error: error.message,
      duration,
      reason: 'no_api_keys_available',
      proxyUrl: proxyBaseUrl
    });
    
    globalActivityLogger?.addKucoinErrorLog(path, error);
    networkStatusService.recordError(error, path);
    throw error;
  }

  // Ensure path starts with forward slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const url = `${proxyBaseUrl}${normalizedPath}${qs ? (normalizedPath.includes('?') ? '&' : '?') + qs : ''}`;

  // Create the signature path (includes query string)
  const signaturePath = normalizedPath + (qs ? (normalizedPath.includes('?') ? '&' : '?') + qs : '');
  
  // Create payload for signature (for debugging)
  const signaturePayload = Date.now().toString() + method.toUpperCase() + signaturePath + (body ? JSON.stringify(body) : '');
  
  const headers = await createAuthHeaders(keys, method, signaturePath, body);

  try {
    console.log(`🔗 KuCoin API Request: ${method} ${signaturePath} via ${proxyBaseUrl}`);
    console.log(`🔐 Using encrypted passphrase for API v2`);
    
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - startTime;

    if (res.status === 429) {
      const error = new RateLimitError(res);
      
      loggingService.logError(`API ERROR ${method} ${signaturePath}`, {
        endpoint: signaturePath,
        method,
        status: res.status,
        duration,
        error: 'rate_limit',
        retryAfter: error.retryAfter,
        proxyUrl: proxyBaseUrl
      });
      
      globalActivityLogger?.addKucoinErrorLog(signaturePath, error);
      networkStatusService.recordError(error, signaturePath);
      throw error;
    }
    
    if (!res.ok) {
      loggingService.logError(`API ERROR ${method} ${signaturePath}`, {
        endpoint: signaturePath,
        method,
        status: res.status,
        duration,
        payload: signaturePayload,
        proxyUrl: proxyBaseUrl
      });
      
      await parseKuCoinError(res, signaturePath, signaturePayload);
    }

    const result = await res.json();
    
    // Check for KuCoin API-level errors (even with 200 status)
    if (result.code && result.code !== '200000') {
      loggingService.logError(`API ERROR ${method} ${signaturePath}`, {
        endpoint: signaturePath,
        method,
        status: res.status,
        duration,
        kucoinCode: result.code,
        kucoinMessage: result.msg,
        payload: signaturePayload,
        proxyUrl: proxyBaseUrl
      });
      
      const mockResponse = new Response(JSON.stringify(result), { status: 400 });
      await parseKuCoinError(mockResponse, signaturePath, signaturePayload);
    }
    
    // Log successful call
    loggingService.logEvent('API', `SUCCESS ${method} ${signaturePath}`, {
      endpoint: signaturePath,
      method,
      status: res.status,
      duration,
      responseSize: JSON.stringify(result).length,
      kucoinCode: result.code,
      proxyUrl: proxyBaseUrl
    });
    
    console.log(`✅ KuCoin API Success: ${method} ${signaturePath} via ${proxyBaseUrl}`);
    globalActivityLogger?.addKucoinSuccessLog(signaturePath, `${method} ${signaturePath}`);
    networkStatusService.recordSuccessfulCall(signaturePath);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const proxyError = new ProxyError(`Proxy not reachable - network error (${proxyBaseUrl})`);
      
      loggingService.logError(`API FAIL ${method} ${signaturePath}`, {
        endpoint: signaturePath,
        method,
        duration,
        error: 'network_error',
        details: error.message,
        proxyUrl: proxyBaseUrl
      });
      
      globalActivityLogger?.addKucoinErrorLog(signaturePath, proxyError);
      networkStatusService.recordError(proxyError, signaturePath);
      throw proxyError;
    }
    
    // Log other errors if not already logged
    if (!(error instanceof RateLimitError || error instanceof ApiError || error instanceof ProxyError)) {
      loggingService.logError(`API FAIL ${method} ${signaturePath}`, {
        endpoint: signaturePath,
        method,
        duration,
        error: error instanceof Error ? error.message : 'unknown_error',
        details: error,
        proxyUrl: proxyBaseUrl
      });
    }
    
    throw error;
  }
}
