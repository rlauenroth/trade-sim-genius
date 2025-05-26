
// KuCoin API utilities for market data and portfolio information

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

// Generate KuCoin API signature using Web Crypto API
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

// Create authenticated headers for KuCoin API
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

// Fetch market tickers for screening
export async function getMarketTickers(credentials: KuCoinCredentials): Promise<MarketTicker[]> {
  const endpoint = '/api/v1/market/allTickers';
  const headers = await createHeaders(credentials, 'GET', endpoint);
  
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
  const headers = await createHeaders(credentials, 'GET', endpoint);
  
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
  const headers = await createHeaders(credentials, 'GET', endpoint);
  
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
  const headers = await createHeaders(credentials, 'GET', endpoint);
  
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

// Get portfolio summary with total USD value
export async function getPortfolioSummary(credentials: KuCoinCredentials): Promise<{
  totalUSDValue: number;
  assets: Array<{
    currency: string;
    balance: number;
    usdValue: number;
  }>;
}> {
  const balances = await getAccountBalances(credentials);
  const assets = [];
  let totalUSDValue = 0;

  for (const balance of balances) {
    const balanceAmount = parseFloat(balance.balance);
    if (balanceAmount > 0) {
      let usdValue = 0;
      
      if (balance.currency === 'USDT') {
        usdValue = balanceAmount;
      } else {
        try {
          const price = await getCurrentPrice(credentials, `${balance.currency}-USDT`);
          usdValue = balanceAmount * price;
        } catch (error) {
          console.warn(`Could not get price for ${balance.currency}:`, error);
        }
      }
      
      assets.push({
        currency: balance.currency,
        balance: balanceAmount,
        usdValue
      });
      
      totalUSDValue += usdValue;
    }
  }

  return {
    totalUSDValue,
    assets
  };
}
