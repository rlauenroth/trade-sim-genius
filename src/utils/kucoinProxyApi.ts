
import { KUCOIN_PROXY_BASE, getStoredKeys } from '@/config';
import { signKuCoinRequest } from './kucoinSigner';
import { RateLimitError, ProxyError, ApiError } from './errors';
import { networkStatusService } from '@/services/networkStatusService';

// Global activity logger - will be set by the component that uses this
let globalActivityLogger: {
  addKucoinSuccessLog: (endpoint: string, message?: string) => void;
  addKucoinErrorLog: (endpoint: string, error: Error) => void;
  addProxyStatusLog: (isConnected: boolean) => void;
} | null = null;

export function setActivityLogger(logger: typeof globalActivityLogger) {
  globalActivityLogger = logger;
}

export async function kucoinFetch(
  path: string,
  method = 'GET',
  query: Record<string, string | number | undefined> = {},
  body?: unknown,
) {
  const keys = getStoredKeys();
  if (!keys) {
    const error = new ProxyError('No API keys available');
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

  const timestamp = Date.now().toString();
  const requestPath = normalizedPath;
  const signature = await signKuCoinRequest(timestamp, method, requestPath, body, keys.secret);

  try {
    console.log(`🔗 KuCoin API Request: ${method} ${requestPath}`);
    
    const res = await fetch(url, {
      method,
      headers: {
        'KC-API-KEY': keys.apiKey,
        'KC-API-SIGN': signature,
        'KC-API-TIMESTAMP': timestamp,
        'KC-API-PASSPHRASE': keys.passphrase,
        'KC-API-KEY-VERSION': '2',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const error = new RateLimitError(res);
      globalActivityLogger?.addKucoinErrorLog(requestPath, error);
      networkStatusService.recordError(error, requestPath);
      throw error;
    }
    
    if (!res.ok) {
      const error = new ApiError(res);
      globalActivityLogger?.addKucoinErrorLog(requestPath, error);
      networkStatusService.recordError(error, requestPath);
      throw error;
    }

    const result = await res.json();
    
    // Log successful call
    console.log(`✅ KuCoin API Success: ${method} ${requestPath}`);
    globalActivityLogger?.addKucoinSuccessLog(requestPath, `${method} ${requestPath}`);
    networkStatusService.recordSuccessfulCall(requestPath);
    
    return result;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const proxyError = new ProxyError('Proxy not reachable - network error');
      globalActivityLogger?.addKucoinErrorLog(requestPath, proxyError);
      networkStatusService.recordError(proxyError, requestPath);
      throw proxyError;
    }
    throw error;
  }
}

// Refactored API methods using the new proxy with correct paths
export async function getMarketTickers() {
  const response = await kucoinFetch('/api/v1/market/allTickers');
  
  if (response.code === '200000' && response.data?.ticker) {
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

export async function getCurrentPrice(symbol: string): Promise<number> {
  const response = await kucoinFetch('/api/v1/market/ticker', 'GET', { symbol });
  
  if (response.code === '200000' && response.data?.price) {
    const price = parseFloat(response.data.price);
    globalActivityLogger?.addKucoinSuccessLog('/api/v1/market/ticker', `Preis für ${symbol}: $${price}`);
    return price;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
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
