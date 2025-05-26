
// Enhanced KuCoin API utilities with live API support
import { mockKucoinApi } from '@/services/mockKucoinApi';
import { apiModeService } from '@/services/apiModeService';

const KUCOIN_BASE_URL = 'https://api.kucoin.com';

interface KuCoinCredentials {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
}

interface MarketTicker {
  symbol: string;
  name: string;
  buy: string;
  sell: string;
  last: string;
  vol: string;
  volValue: string;
  changeRate: string;
  changePrice: string;
  high: string;
  low: string;
}

interface AccountBalance {
  currency: string;
  balance: string;
  available: string;
  holds: string;
}

interface Candle {
  time: string;
  open: string;
  close: string;
  high: string;
  low: string;
  volume: string;
  turnover: string;
}

// Enhanced rate limiting
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 100; // KuCoin limit
  private readonly timeWindow = 10000; // 10 seconds

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  async waitIfNeeded(): Promise<void> {
    if (!this.canMakeRequest()) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (Date.now() - oldestRequest);
      console.log(`Rate limit reached, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.recordRequest();
  }
}

const rateLimiter = new RateLimiter();

// Live API functions for public endpoints
async function fetchPublicEndpoint(endpoint: string): Promise<any> {
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.corsIssuesDetected || apiMode.kucoinMode === 'mock') {
    throw new Error('CORS_NOT_SUPPORTED');
  }

  await rateLimiter.waitIfNeeded();

  const response = await fetch(`${KUCOIN_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Signature generation for private endpoints (when CORS allows)
async function generateSignature(
  timestamp: string,
  method: string,
  endpoint: string,
  body: string,
  secret: string
): Promise<string> {
  const what = timestamp + method + endpoint + body;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(what));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function createHeaders(
  credentials: KuCoinCredentials,
  method: string,
  endpoint: string,
  body: string = ''
): Promise<HeadersInit> {
  const timestamp = Date.now().toString();
  const signature = await generateSignature(timestamp, method, endpoint, body, credentials.kucoinApiSecret);
  
  return {
    'KC-API-KEY': credentials.kucoinApiKey,
    'KC-API-SIGN': signature,
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': credentials.kucoinApiPassphrase,
    'KC-API-KEY-VERSION': '2',
    'Content-Type': 'application/json'
  };
}

// Enhanced public endpoint implementations
export async function getMarketTickers(credentials: KuCoinCredentials): Promise<MarketTicker[]> {
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.kucoinMode === 'mock' || apiMode.corsIssuesDetected) {
    console.log('Using mock KuCoin API - getMarketTickers (CORS limitations)');
    return mockKucoinApi.getMarketTickers();
  }

  try {
    console.log('Using live KuCoin API - getMarketTickers');
    const response = await fetchPublicEndpoint('/api/v1/market/allTickers');
    
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
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Live KuCoin API failed, falling back to mock:', error);
    apiModeService.setKucoinMode('mock');
    return mockKucoinApi.getMarketTickers();
  }
}

export async function getCurrentPrice(credentials: KuCoinCredentials, symbol: string): Promise<number> {
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.kucoinMode === 'mock' || apiMode.corsIssuesDetected) {
    console.log(`Using mock KuCoin API - getCurrentPrice for ${symbol} (CORS limitations)`);
    return mockKucoinApi.getCurrentPrice(symbol);
  }

  try {
    console.log(`Using live KuCoin API - getCurrentPrice for ${symbol}`);
    const response = await fetchPublicEndpoint(`/api/v1/market/ticker?symbol=${symbol}`);
    
    if (response.code === '200000' && response.data?.price) {
      return parseFloat(response.data.price);
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn(`Live KuCoin price fetch failed for ${symbol}, using mock:`, error);
    return mockKucoinApi.getCurrentPrice(symbol);
  }
}

export async function getHistoricalCandles(
  credentials: KuCoinCredentials,
  symbol: string,
  type: string = '5min',
  startAt?: number,
  endAt?: number
): Promise<Candle[]> {
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.kucoinMode === 'mock' || apiMode.corsIssuesDetected) {
    console.log(`Using mock KuCoin API - getHistoricalCandles for ${symbol} (CORS limitations)`);
    return mockKucoinApi.getHistoricalCandles(symbol, type, startAt, endAt);
  }

  try {
    console.log(`Using live KuCoin API - getHistoricalCandles for ${symbol}`);
    let endpoint = `/api/v1/market/candles?symbol=${symbol}&type=${type}`;
    
    if (startAt) endpoint += `&startAt=${startAt}`;
    if (endAt) endpoint += `&endAt=${endAt}`;
    
    const response = await fetchPublicEndpoint(endpoint);
    
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
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn(`Live KuCoin candles fetch failed for ${symbol}, using mock:`, error);
    return mockKucoinApi.getHistoricalCandles(symbol, type, startAt, endAt);
  }
}

// Private endpoints remain mock for now due to CORS complexity
export async function getAccountBalances(credentials: KuCoinCredentials): Promise<AccountBalance[]> {
  console.log('Using mock KuCoin API - getAccountBalances (private endpoint, CORS limitations)');
  return mockKucoinApi.getAccountBalances();
}

export async function getPortfolioSummary(credentials: KuCoinCredentials): Promise<{
  totalUSDValue: number;
  assets: Array<{
    currency: string;
    balance: number;
    usdValue: number;
  }>;
}> {
  console.log('Using mock KuCoin API - getPortfolioSummary (private endpoint, CORS limitations)');
  return mockKucoinApi.getPortfolioSummary();
}
