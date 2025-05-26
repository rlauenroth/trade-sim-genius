
// Enhanced KuCoin API utilities with PHP proxy support
import { mockKucoinApi } from '@/services/mockKucoinApi';
import { apiModeService } from '@/services/apiModeService';
import { 
  getMarketTickers as proxyGetMarketTickers,
  getCurrentPrice as proxyGetCurrentPrice,
  getHistoricalCandles as proxyGetHistoricalCandles,
  getAccountBalances as proxyGetAccountBalances,
  testProxyConnection
} from './kucoinProxyApi';
import { networkStatusService } from '@/services/networkStatusService';

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

// Enhanced public endpoint implementations with proxy support
export async function getMarketTickers(credentials: KuCoinCredentials): Promise<MarketTicker[]> {
  const apiMode = apiModeService.getApiModeStatus();
  
  // Try proxy first if available
  if (apiMode.kucoinMode !== 'mock') {
    try {
      console.log('Using PHP proxy for KuCoin API - getMarketTickers');
      const result = await proxyGetMarketTickers();
      return result;
    } catch (error) {
      console.warn('PHP proxy failed, falling back to mock:', error);
      networkStatusService.recordError(error as Error);
      apiModeService.setKucoinMode('mock');
    }
  }
  
  console.log('Using mock KuCoin API - getMarketTickers');
  return mockKucoinApi.getMarketTickers();
}

export async function getCurrentPrice(credentials: KuCoinCredentials, symbol: string): Promise<number> {
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.kucoinMode !== 'mock') {
    try {
      console.log(`Using PHP proxy for KuCoin API - getCurrentPrice for ${symbol}`);
      const result = await proxyGetCurrentPrice(symbol);
      return result;
    } catch (error) {
      console.warn(`PHP proxy price fetch failed for ${symbol}, using mock:`, error);
      networkStatusService.recordError(error as Error);
    }
  }
  
  console.log(`Using mock KuCoin API - getCurrentPrice for ${symbol}`);
  return mockKucoinApi.getCurrentPrice(symbol);
}

export async function getHistoricalCandles(
  credentials: KuCoinCredentials,
  symbol: string,
  type: string = '5min',
  startAt?: number,
  endAt?: number
): Promise<Candle[]> {
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.kucoinMode !== 'mock') {
    try {
      console.log(`Using PHP proxy for KuCoin API - getHistoricalCandles for ${symbol}`);
      const result = await proxyGetHistoricalCandles(symbol, type, startAt, endAt);
      return result;
    } catch (error) {
      console.warn(`PHP proxy candles fetch failed for ${symbol}, using mock:`, error);
      networkStatusService.recordError(error as Error);
    }
  }
  
  console.log(`Using mock KuCoin API - getHistoricalCandles for ${symbol}`);
  return mockKucoinApi.getHistoricalCandles(symbol, type, startAt, endAt);
}

// Private endpoints now use proxy
export async function getAccountBalances(credentials: KuCoinCredentials): Promise<AccountBalance[]> {
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.kucoinMode !== 'mock') {
    try {
      console.log('Using PHP proxy for KuCoin API - getAccountBalances');
      const result = await proxyGetAccountBalances();
      return result;
    } catch (error) {
      console.warn('PHP proxy account balances failed, using mock:', error);
      networkStatusService.recordError(error as Error);
    }
  }
  
  console.log('Using mock KuCoin API - getAccountBalances');
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
  const apiMode = apiModeService.getApiModeStatus();
  
  if (apiMode.kucoinMode !== 'mock') {
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
      console.warn('PHP proxy portfolio summary failed, using mock:', error);
      networkStatusService.recordError(error as Error);
    }
  }
  
  console.log('Using mock KuCoin API - getPortfolioSummary');
  return mockKucoinApi.getPortfolioSummary();
}

// Proxy connection test utility
export { testProxyConnection };
