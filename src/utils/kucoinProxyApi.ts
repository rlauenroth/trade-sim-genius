import { KUCOIN_PROXY_BASE, getStoredKeys } from '@/config';
import { signKuCoinRequest } from './kucoinSigner';
import { 
  RateLimitError, 
  ProxyError, 
  ApiError, 
  TimestampError, 
  SignatureError, 
  IPWhitelistError, 
  MissingHeaderError 
} from './errors';
import { networkStatusService } from '@/services/networkStatusService';
import { cacheService, CACHE_TTL } from '@/services/cacheService';
import { loggingService } from '@/services/loggingService';

// Global activity logger - will be set by the component that uses this
let globalActivityLogger: {
  addKucoinSuccessLog: (endpoint: string, message?: string) => void;
  addKucoinErrorLog: (endpoint: string, error: Error) => void;
  addProxyStatusLog: (isConnected: boolean) => void;
} | null = null;

export function setActivityLogger(logger: typeof globalActivityLogger) {
  globalActivityLogger = logger;
}

// Encrypt passphrase using HMAC-SHA256 with secret (KuCoin API v2 requirement)
async function encryptPassphrase(passphrase: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(passphrase));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Enhanced error parsing for KuCoin responses
async function parseKuCoinError(response: Response, requestPath: string, payload?: string): Promise<never> {
  let kucoinData: any = null;
  
  try {
    kucoinData = await response.json();
  } catch {
    // Failed to parse JSON, use generic error
  }

  const errorCode = kucoinData?.code;
  const localTime = Date.now();
  
  // Map specific KuCoin error codes
  switch (errorCode) {
    case '400001':
      throw new MissingHeaderError(response, kucoinData);
    case '400002':
      // Try to get server time for drift calculation
      const serverTimeHeader = response.headers.get('KC-API-TIME');
      const serverTime = serverTimeHeader ? parseInt(serverTimeHeader) : null;
      throw new TimestampError(response, kucoinData, localTime, serverTime || undefined);
    case '400005':
      throw new SignatureError(response, kucoinData, payload);
    case '400006':
      throw new IPWhitelistError(response, kucoinData);
    default:
      throw new ApiError(response, kucoinData);
  }
}

export async function kucoinFetch(
  path: string,
  method = 'GET',
  query: Record<string, string | number | undefined> = {},
  body?: unknown,
) {
  const startTime = Date.now();
  const keys = getStoredKeys();
  
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
  const timestamp = Date.now().toString();
  
  // Create payload for signature (for debugging)
  const signaturePayload = timestamp + method.toUpperCase() + signaturePath + (body ? JSON.stringify(body) : '');
  
  const signature = await signKuCoinRequest(timestamp, method, signaturePath, body, keys.secret);
  
  // Encrypt passphrase with secret key (KuCoin API v2 requirement)
  const encryptedPassphrase = await encryptPassphrase(keys.passphrase, keys.secret);

  try {
    console.log(`🔗 KuCoin API Request: ${method} ${signaturePath}`);
    console.log(`🔐 Using encrypted passphrase for API v2`);
    
    const res = await fetch(url, {
      method,
      headers: {
        'KC-API-KEY': keys.apiKey,
        'KC-API-SIGN': signature,
        'KC-API-TIMESTAMP': timestamp,
        'KC-API-PASSPHRASE': encryptedPassphrase,
        'KC-API-KEY-VERSION': '2',
        'Content-Type': 'application/json',
      },
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

// Enhanced price fetching function with caching
export async function getPrice(symbol: string): Promise<number> {
  // Check cache first
  const cachedPrice = cacheService.get<number>('prices', symbol);
  if (cachedPrice) {
    loggingService.logEvent('API', `PRICE CACHE HIT ${symbol}`, {
      symbol,
      price: cachedPrice,
      source: 'cache'
    });
    return cachedPrice;
  }

  // Primary: Use Level 1 Orderbook endpoint
  try {
    console.log(`🔍 Fetching price for ${symbol} via Level 1 orderbook...`);
    const response = await kucoinFetch('/api/v1/market/orderbook/level1', 'GET', { symbol });
    
    if (response.code === '200000' && response.data?.price) {
      const price = parseFloat(response.data.price);
      
      // Cache the price
      cacheService.set('prices', price, CACHE_TTL.PRICE, symbol);
      
      loggingService.logSuccess(`PRICE FETCHED ${symbol}`, {
        symbol,
        price,
        source: 'level1_orderbook',
        cached: true
      });
      
      globalActivityLogger?.addKucoinSuccessLog('/api/v1/market/orderbook/level1', `Preis für ${symbol}: $${price}`);
      return price;
    }
    
    throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
  } catch (error) {
    console.log(`⚠️ Level 1 orderbook failed for ${symbol}, trying fallback...`);
    
    // Fallback: Use allTickers endpoint
    if (error instanceof ApiError && (error.status === 404 || error.code === '400001')) {
      try {
        console.log(`🔄 Using allTickers fallback for ${symbol}...`);
        
        // Check if we have cached allTickers
        let allTickersData = cacheService.get<any>('allTickers');
        
        if (!allTickersData) {
          const response = await kucoinFetch('/api/v1/market/allTickers');
          if (response.code === '200000' && response.data?.ticker) {
            allTickersData = response.data;
            // Cache allTickers data
            cacheService.set('allTickers', allTickersData, CACHE_TTL.ALL_TICKERS);
          } else {
            throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
          }
        }
        
        const ticker = allTickersData.ticker.find((t: any) => t.symbol === symbol);
        if (!ticker || !ticker.last) {
          throw new ProxyError(`Ticker ${symbol} not found in allTickers`);
        }
        
        const price = parseFloat(ticker.last);
        
        // Cache the price from fallback
        cacheService.set('prices', price, CACHE_TTL.PRICE, symbol);
        
        loggingService.logSuccess(`PRICE FETCHED ${symbol}`, {
          symbol,
          price,
          source: 'allTickers_fallback',
          cached: true
        });
        
        globalActivityLogger?.addKucoinSuccessLog('/api/v1/market/allTickers', `Fallback-Preis für ${symbol}: $${price}`);
        return price;
      } catch (fallbackError) {
        console.error(`❌ Both price endpoints failed for ${symbol}:`, fallbackError);
        
        loggingService.logError(`PRICE FETCH FAILED ${symbol}`, {
          symbol,
          error: 'all_endpoints_failed',
          primaryError: error instanceof Error ? error.message : 'unknown',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'unknown'
        });
        
        throw new ProxyError(`Price for ${symbol} not available from any endpoint`);
      }
    }
    
    // Re-throw other errors
    throw error;
  }
}

export async function getMarketTickers() {
  // Check cache first
  const cachedTickers = cacheService.get<any>('allTickers');
  if (cachedTickers && cachedTickers.ticker) {
    const tickers = cachedTickers.ticker.map((ticker: any) => ({
      symbol: ticker.symbol,
      name: ticker.symbol.replace('-', '/'),
      buy: ticker.buy || '0',
      sell: ticker.sell || '0',
      last: ticker.last || '0',
      vol: ticker.vol || '0',
      volValue: ticker.volValue || '0',
      changeRate: ticker.changeRate || '0',
      changePrice: ticker.changePrice || '0',
      high: ticker.high || '0',
      low: ticker.low || '0'
    }));
    
    console.log(`📦 Market tickers (cached): ${tickers.length} tickers`);
    return tickers;
  }

  // Fetch fresh data
  const response = await kucoinFetch('/api/v1/market/allTickers');
  
  if (response.code === '200000' && response.data?.ticker) {
    // Cache the response
    cacheService.set('allTickers', response.data, CACHE_TTL.ALL_TICKERS);
    
    const tickers = response.data.ticker.map((ticker: any) => ({
      symbol: ticker.symbol,
      name: ticker.symbol.replace('-', '/'),
      buy: ticker.buy || '0',
      sell: ticker.sell || '0',
      last: ticker.last || '0',
      vol: ticker.vol || '0',
      volValue: ticker.volValue || '0',
      changeRate: ticker.changeRate || '0',
      changePrice: ticker.changePrice || '0',
      high: ticker.high || '0',
      low: ticker.low || '0'
    }));
    
    globalActivityLogger?.addKucoinSuccessLog('/api/v1/market/allTickers', `${tickers.length} Market Tickers geladen`);
    return tickers;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

// Updated getCurrentPrice to use the new getPrice function
export async function getCurrentPrice(symbol: string): Promise<number> {
  return await getPrice(symbol);
}

export async function getAccountBalances() {
  const response = await kucoinFetch('/api/v1/accounts');
  
  if (response.code === '200000' && Array.isArray(response.data)) {
    const balances = response.data.map((account: any) => ({
      currency: account.currency,
      balance: account.balance,
      available: account.available,
      holds: account.holds
    }));
    
    const nonZeroBalances = balances.filter(b => parseFloat(b.balance) > 0);
    globalActivityLogger?.addKucoinSuccessLog('/api/v1/accounts', `${nonZeroBalances.length} Kontosalden geladen`);
    return balances;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

export async function getHistoricalCandles(
  symbol: string,
  type: string = '5min',
  startAt?: number,
  endAt?: number
) {
  // Create cache key based on parameters
  const cacheKey = `${symbol}-${type}-${startAt}-${endAt}`;
  
  // Check cache first
  const cachedCandles = cacheService.get<any[]>('candles', cacheKey);
  if (cachedCandles) {
    console.log(`📦 Candles for ${symbol} (cached): ${cachedCandles.length} candles`);
    return cachedCandles;
  }

  const query: Record<string, string | number | undefined> = { symbol, type };
  if (startAt) query.startAt = startAt;
  if (endAt) query.endAt = endAt;

  const response = await kucoinFetch('/api/v1/market/candles', 'GET', query);
  
  if (response.code === '200000' && Array.isArray(response.data)) {
    const candles = response.data.map((candle: string[]) => ({
      time: candle[0],
      open: candle[1],
      close: candle[2],
      high: candle[3],
      low: candle[4],
      volume: candle[5],
      turnover: candle[6]
    }));
    
    // Cache the candles
    cacheService.set('candles', candles, CACHE_TTL.CANDLES, cacheKey);
    
    globalActivityLogger?.addKucoinSuccessLog('/api/v1/market/candles', `${candles.length} Kerzen für ${symbol} geladen`);
    return candles;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

// Proxy connection test with correct path
export async function testProxyConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing KuCoin proxy connection...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(`${KUCOIN_PROXY_BASE}/api/v1/status`, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // 404 is expected from KuCoin for this endpoint, means proxy is working
    const isConnected = response.status === 404 || response.status === 200;
    
    if (isConnected) {
      console.log('✅ KuCoin proxy connection successful');
      globalActivityLogger?.addProxyStatusLog(true);
      networkStatusService.recordSuccessfulCall('/api/v1/status');
      networkStatusService.setInitialProxyStatus(true);
    } else {
      console.log('❌ KuCoin proxy connection failed');
      globalActivityLogger?.addProxyStatusLog(false);
      networkStatusService.setInitialProxyStatus(false);
    }
    
    return isConnected;
  } catch (error) {
    console.error('❌ Proxy connection test failed:', error);
    globalActivityLogger?.addProxyStatusLog(false);
    networkStatusService.setInitialProxyStatus(false);
    return false;
  }
}
