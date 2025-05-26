
// KuCoin API utilities for market data and portfolio information
import { createHmac } from 'crypto';

const KUCOIN_BASE_URL = 'https://api.kucoin.com';

interface KuCoinCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
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

// Generate KuCoin API signature
function generateSignature(
  timestamp: string,
  method: string,
  endpoint: string,
  body: string,
  secret: string
): string {
  const what = timestamp + method + endpoint + body;
  return createHmac('sha256', secret).update(what).digest('base64');
}

// Create authenticated headers for KuCoin API
function createHeaders(
  credentials: KuCoinCredentials,
  method: string,
  endpoint: string,
  body: string = ''
): HeadersInit {
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, method, endpoint, body, credentials.apiSecret);
  
  return {
    'KC-API-KEY': credentials.apiKey,
    'KC-API-SIGN': signature,
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': credentials.passphrase,
    'KC-API-KEY-VERSION': '2',
    'Content-Type': 'application/json'
  };
}

// Fetch market tickers for screening
export async function getMarketTickers(credentials: KuCoinCredentials): Promise<MarketTicker[]> {
  const endpoint = '/api/v1/market/allTickers';
  const headers = createHeaders(credentials, 'GET', endpoint);
  
  const response = await fetch(`${KUCOIN_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`KuCoin API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data?.ticker || [];
}

// Fetch account balances
export async function getAccountBalances(credentials: KuCoinCredentials): Promise<AccountBalance[]> {
  const endpoint = '/api/v1/accounts';
  const headers = createHeaders(credentials, 'GET', endpoint);
  
  const response = await fetch(`${KUCOIN_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`KuCoin API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

// Fetch historical candles for AI analysis
export async function getHistoricalCandles(
  credentials: KuCoinCredentials,
  symbol: string,
  type: string = '5min',
  startAt?: number,
  endAt?: number
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol,
    type
  });
  
  if (startAt) params.append('startAt', startAt.toString());
  if (endAt) params.append('endAt', endAt.toString());
  
  const endpoint = `/api/v1/market/candles?${params.toString()}`;
  const headers = createHeaders(credentials, 'GET', endpoint);
  
  const response = await fetch(`${KUCOIN_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`KuCoin API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const candles = data.data || [];
  
  // Convert array format to object format
  return candles.map((candle: string[]) => ({
    time: candle[0],
    open: candle[1],
    close: candle[2],
    high: candle[3],
    low: candle[4],
    volume: candle[5],
    turnover: candle[6]
  }));
}

// Get current price for a specific symbol
export async function getCurrentPrice(credentials: KuCoinCredentials, symbol: string): Promise<number> {
  const endpoint = `/api/v1/market/orderbook/level1?symbol=${symbol}`;
  const headers = createHeaders(credentials, 'GET', endpoint);
  
  const response = await fetch(`${KUCOIN_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`KuCoin API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return parseFloat(data.data?.price || '0');
}
