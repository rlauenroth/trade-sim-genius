
import { cacheService, CACHE_TTL } from '@/services/cacheService';
import { loggingService } from '@/services/loggingService';
import { ApiError, ProxyError } from '../errors';
import { kucoinFetch } from './core';
import { ActivityLogger } from './types';

// Global activity logger access
let globalActivityLogger: ActivityLogger | null = null;

export function setMarketDataActivityLogger(logger: ActivityLogger | null) {
  globalActivityLogger = logger;
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

// Updated getCurrentPrice to use the new getPrice function
export async function getCurrentPrice(symbol: string): Promise<number> {
  return await getPrice(symbol);
}
