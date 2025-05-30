
import { kucoinFetch } from './core';
import { ApiError } from '../errors';
import { cacheService } from '@/services/cacheService';
import { ActivityLogger } from './types';

// Global activity logger access
let globalActivityLogger: ActivityLogger | null = null;

export function setMarketDataActivityLogger(logger: ActivityLogger | null) {
  globalActivityLogger = logger;
}

// Market data functions with enhanced proxy URL usage
export async function getPrice(symbol: string): Promise<number> {
  const cacheKey = `price_${symbol}`;
  
  // Try cache first
  const cachedPrice = cacheService.get<number>(cacheKey);
  if (cachedPrice !== undefined) {
    console.log(`💰 Price for ${symbol}: $${cachedPrice} (cached)`);
    return cachedPrice;
  }

  const response = await kucoinFetch(`/api/v1/market/orderbook/level1?symbol=${symbol}`);
  
  if (response.code === '200000' && response.data) {
    const price = parseFloat(response.data.price);
    
    // Cache for 30 seconds
    cacheService.set(cacheKey, price, 30000);
    
    console.log(`💰 Price for ${symbol}: $${price} (live)`);
    globalActivityLogger?.addKucoinSuccessLog(`/api/v1/market/orderbook/level1?symbol=${symbol}`, `Preis für ${symbol}: $${price}`);
    return price;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

export async function getMarketTickers() {
  const response = await kucoinFetch('/api/v1/market/allTickers');
  
  if (response.code === '200000' && response.data?.ticker) {
    const tickers = response.data.ticker.map((ticker: any) => ({
      symbol: ticker.symbol,
      name: ticker.symbolName || ticker.symbol,
      buy: ticker.buy,
      sell: ticker.sell,
      last: ticker.last,
      vol: ticker.vol,
      volValue: ticker.volValue,
      changeRate: ticker.changeRate,
      changePrice: ticker.changePrice,
      high: ticker.high,
      low: ticker.low
    }));
    
    globalActivityLogger?.addKucoinSuccessLog('/api/v1/market/allTickers', `${tickers.length} Ticker geladen`);
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
  const query: Record<string, string | number | undefined> = {
    symbol,
    type,
    startAt,
    endAt
  };

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
    
    globalActivityLogger?.addKucoinSuccessLog(`/api/v1/market/candles?symbol=${symbol}`, `${candles.length} Kerzen für ${symbol} geladen`);
    return candles;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

// Legacy functions for backward compatibility
export const getCurrentPrice = getPrice;
