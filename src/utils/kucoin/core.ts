import { KUCOIN_PROXY_BASE, getStoredKeys } from '@/config';
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

// Global activity logger - will be set by the component that uses this
let globalActivityLogger: ActivityLogger | null = null;

export function setActivityLogger(logger: ActivityLogger | null) {
  globalActivityLogger = logger;
}

// Helper function to get temporary keys during verification
function getTempKeys() {
  try {
    const tempKeys = localStorage.getItem('temp_kucoin_keys');
    if (tempKeys) {
      const parsed = JSON.parse(tempKeys);
      console.log('🔑 Retrieved temp keys:', { hasApiKey: !!parsed.apiKey, hasApiSecret: !!parsed.apiSecret, hasPassphrase: !!parsed.passphrase });
      
      // Ensure compatibility with both old and new field names
      return {
        apiKey: parsed.apiKey || parsed.key,
        apiSecret: parsed.apiSecret || parsed.secret,
        passphrase: parsed.passphrase
      };
    }
  } catch (error) {
    console.warn('Could not parse temp keys:', error);
  }
  return null;
}

export async function kucoinFetch(
  path: string,
  method = 'GET',
  query: Record<string, string | number | undefined> = {},
  body?: unknown,
) {
  const startTime = Date.now();
  
  // Try to get stored keys first, then temp keys for verification
  let keys = getStoredKeys();
  if (!keys) {
    keys = getTempKeys();
  }
  
  // Log API call start
  loggingService.logEvent('API', `CALL ${method} ${path}`, {
    endpoint: path,
    method,
    query,
    body: body ? JSON.stringify(body) : undefined,
    hasKeys: !!keys
  });
  
  if (!keys) {
    const error = new ProxyError('No API keys available');
    const duration = Date.now() - startTime;
    
    loggingService.logError(`API FAIL ${method} ${path}`, {
      endpoint: path,
      method,
      error: error.message,
      duration,
      reason: 'no_api_keys'
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

  const url = `${KUCOIN_PROXY_BASE}${normalizedPath}${qs ? (normalizedPath.includes('?') ? '&' : '?') + qs : ''}`;

  // Create the signature path (includes query string)
  const signaturePath = normalizedPath + (qs ? (normalizedPath.includes('?') ? '&' : '?') + qs : '');
  
  // Create payload for signature (for debugging)
  const signaturePayload = Date.now().toString() + method.toUpperCase() + signaturePath + (body ? JSON.stringify(body) : '');
  
  const headers = await createAuthHeaders(keys, method, signaturePath, body);

  try {
    console.log(`🔗 KuCoin API Request: ${method} ${signaturePath}`);
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
        retryAfter: error.retryAfter
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
        payload: signaturePayload
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
        payload: signaturePayload
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
      kucoinCode: result.code
    });
    
    console.log(`✅ KuCoin API Success: ${method} ${signaturePath}`);
    globalActivityLogger?.addKucoinSuccessLog(signaturePath, `${method} ${signaturePath}`);
    networkStatusService.recordSuccessfulCall(signaturePath);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const proxyError = new ProxyError('Proxy not reachable - network error');
      
      loggingService.logError(`API FAIL ${method} ${signaturePath}`, {
        endpoint: signaturePath,
        method,
        duration,
        error: 'network_error',
        details: error.message
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
        details: error
      });
    }
    
    throw error;
  }
}
