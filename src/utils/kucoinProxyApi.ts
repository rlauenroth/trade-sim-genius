
import { KUCOIN_PROXY_BASE, getStoredKeys } from '@/config';
import { signKuCoinRequest } from './kucoinSigner';
import { RateLimitError, ProxyError, ApiError } from './errors';

export async function kucoinFetch(
  path: string,
  method = 'GET',
  query: Record<string, string | number | undefined> = {},
  body?: unknown,
) {
  const keys = getStoredKeys();
  if (!keys) {
    throw new ProxyError('No API keys available');
  }

  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const url = `${KUCOIN_PROXY_BASE}${path}${qs ? (path.includes('?') ? '&' : '?') + qs : ''}`;

  const timestamp = Date.now().toString();
  const requestPath = `/${path}`;
  const signature = await signKuCoinRequest(timestamp, method, requestPath, body, keys.secret);

  try {
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
      throw new RateLimitError(res);
    }
    
    if (!res.ok) {
      throw new ApiError(res);
    }

    return res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ProxyError('Proxy not reachable - network error');
    }
    throw error;
  }
}

// Refactored API methods using the new proxy
export async function getMarketTickers() {
  const response = await kucoinFetch('api/v1/market/allTickers');
  
  if (response.code === '200000' && response.data?.ticker) {
    return response.data.ticker.map((ticker: any) => ({
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
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

export async function getCurrentPrice(symbol: string): Promise<number> {
  const response = await kucoinFetch(`api/v1/market/ticker`, { symbol });
  
  if (response.code === '200000' && response.data?.price) {
    return parseFloat(response.data.price);
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

export async function getAccountBalances() {
  const response = await kucoinFetch('api/v1/accounts');
  
  if (response.code === '200000' && Array.isArray(response.data)) {
    return response.data.map((account: any) => ({
      currency: account.currency,
      balance: account.balance,
      available: account.available,
      holds: account.holds
    }));
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

  const response = await kucoinFetch('api/v1/market/candles', 'GET', query);
  
  if (response.code === '200000' && Array.isArray(response.data)) {
    return response.data.map((candle: string[]) => ({
      time: candle[0],
      open: candle[1],
      close: candle[2],
      high: candle[3],
      low: candle[4],
      volume: candle[5],
      turnover: candle[6]
    }));
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

// Proxy connection test
export async function testProxyConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(`${KUCOIN_PROXY_BASE}api/v1/status`, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // 404 is expected from KuCoin for this endpoint, means proxy is working
    return response.status === 404 || response.status === 200;
  } catch (error) {
    console.error('Proxy connection test failed:', error);
    return false;
  }
}
