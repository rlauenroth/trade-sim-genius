
// Enhanced KuCoin API utilities with PHP proxy support - NO MOCK FALLBACKS
import { 
  getMarketTickers as proxyGetMarketTickers,
  getCurrentPrice as proxyGetCurrentPrice,
  getHistoricalCandles as proxyGetHistoricalCandles,
  getAccountBalances as proxyGetAccountBalances,
  testProxyConnection
} from './kucoinProxyApi';
import { networkStatusService } from '@/services/networkStatusService';
import { ProxyError, ApiError } from './errors';

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

// Enhanced public endpoint implementations with proxy support - NO MOCK FALLBACKS
export async function getMarketTickers(credentials: KuCoinCredentials): Promise<MarketTicker[]> {
  try {
    console.log('Using PHP proxy for KuCoin API - getMarketTickers');
    const result = await proxyGetMarketTickers();
    return result;
  } catch (error) {
    console.error('KuCoin API failed:', error);
    networkStatusService.recordError(error as Error);
    throw new ProxyError('KuCoin market data not available');
  }
}

export async function getCurrentPrice(credentials: KuCoinCredentials, symbol: string): Promise<number> {
  try {
    console.log(`Using PHP proxy for KuCoin API - getCurrentPrice for ${symbol}`);
    const result = await proxyGetCurrentPrice(symbol);
    return result;
  } catch (error) {
    console.error(`Price fetch failed for ${symbol}:`, error);
    networkStatusService.recordError(error as Error);
    throw new ProxyError(`Price for ${symbol} not available`);
  }
}

export async function getHistoricalCandles(
  credentials: KuCoinCredentials,
  symbol: string,
  type: string = '5min',
  startAt?: number,
  endAt?: number
): Promise<Candle[]> {
  try {
    console.log(`Using PHP proxy for KuCoin API - getHistoricalCandles for ${symbol}`);
    const result = await proxyGetHistoricalCandles(symbol, type, startAt, endAt);
    return result;
  } catch (error) {
    console.error(`Candles fetch failed for ${symbol}:`, error);
    networkStatusService.recordError(error as Error);
    throw new ProxyError(`Historical data for ${symbol} not available`);
  }
}

// Private endpoints use proxy - NO MOCK FALLBACKS
export async function getAccountBalances(credentials: KuCoinCredentials): Promise<AccountBalance[]> {
  try {
    console.log('Using PHP proxy for KuCoin API - getAccountBalances');
    const result = await proxyGetAccountBalances();
    return result;
  } catch (error) {
    console.error('Account balances fetch failed:', error);
    networkStatusService.recordError(error as Error);
    throw new ProxyError('Account data not available from KuCoin');
  }
}

export async function getPortfolioSummary(credentials: KuCoinCredentials): Promise<{
  totalUSDValue: number;
  assets: Array<{
    currency: string;
    balance: number;
    usdValue: number;
  }>;
}> {
  try {
    console.log('Using PHP proxy for KuCoin API - getPortfolioSummary');
    const balances = await proxyGetAccountBalances();
    
    // Calculate portfolio summary from balances
    let totalUSDValue = 0;
    const assets = [];
    
    for (const balance of balances) {
      const balanceNum = parseFloat(balance.balance);
      if (balanceNum > 0) {
        let usdValue = 0;
        
        if (balance.currency === 'USDT') {
          usdValue = balanceNum;
        } else {
          try {
            const price = await proxyGetCurrentPrice(`${balance.currency}-USDT`);
            usdValue = balanceNum * price;
          } catch (error) {
            console.warn(`Could not get price for ${balance.currency}:`, error);
          }
        }
        
        totalUSDValue += usdValue;
        assets.push({
          currency: balance.currency,
          balance: balanceNum,
          usdValue
        });
      }
    }
    
    return { totalUSDValue, assets };
  } catch (error) {
    console.error('Portfolio summary fetch failed:', error);
    networkStatusService.recordError(error as Error);
    throw new ProxyError('Portfolio data not available from KuCoin');
  }
}

// Proxy connection test utility
export { testProxyConnection };
