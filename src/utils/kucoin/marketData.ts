
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

// Enhanced trading functions that were missing
export async function getOrderbookSnapshot(symbol: string) {
  const cacheKey = `orderbook_${symbol}`;
  
  // Try cache first (short cache for orderbook)
  const cachedOrderbook = cacheService.get<any>(cacheKey);
  if (cachedOrderbook !== undefined) {
    return cachedOrderbook;
  }

  const response = await kucoinFetch(`/api/v1/market/orderbook/level1?symbol=${symbol}`);
  
  if (response.code === '200000' && response.data) {
    const orderbook = {
      price: parseFloat(response.data.price),
      bestBid: parseFloat(response.data.bestBid),
      bestAsk: parseFloat(response.data.bestAsk),
      size: parseFloat(response.data.size),
      bestBidSize: parseFloat(response.data.bestBidSize),
      bestAskSize: parseFloat(response.data.bestAskSize)
    };
    
    // Cache for 5 seconds
    cacheService.set(cacheKey, orderbook, 5000);
    
    globalActivityLogger?.addKucoinSuccessLog(`/api/v1/market/orderbook/level1?symbol=${symbol}`, `Orderbook für ${symbol} geladen`);
    return orderbook;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

export async function getSymbolInfo(symbol: string) {
  const cacheKey = `symbol_info_${symbol}`;
  
  // Try cache first (long cache for symbol info)
  const cachedInfo = cacheService.get<any>(cacheKey);
  if (cachedInfo !== undefined) {
    return cachedInfo;
  }

  const response = await kucoinFetch(`/api/v1/symbols/${symbol}`);
  
  if (response.code === '200000' && response.data) {
    const symbolInfo = {
      symbol: response.data.symbol,
      name: response.data.name,
      baseCurrency: response.data.baseCurrency,
      quoteCurrency: response.data.quoteCurrency,
      baseMinSize: parseFloat(response.data.baseMinSize),
      quoteMinSize: parseFloat(response.data.quoteMinSize),
      baseMaxSize: parseFloat(response.data.baseMaxSize),
      quoteMaxSize: parseFloat(response.data.quoteMaxSize),
      baseIncrement: parseFloat(response.data.baseIncrement),
      quoteIncrement: parseFloat(response.data.quoteIncrement),
      priceIncrement: parseFloat(response.data.priceIncrement),
      feeCurrency: response.data.feeCurrency,
      enableTrading: response.data.enableTrading,
      isMarginEnabled: response.data.isMarginEnabled,
      priceLimitRate: parseFloat(response.data.priceLimitRate)
    };
    
    // Cache for 1 hour
    cacheService.set(cacheKey, symbolInfo, 3600000);
    
    globalActivityLogger?.addKucoinSuccessLog(`/api/v1/symbols/${symbol}`, `Symbol-Info für ${symbol} geladen`);
    return symbolInfo;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}

// Utility functions for tick size compliance
export function roundToTickSize(price: number, tickSize: number, roundUp: boolean = false): number {
  if (tickSize <= 0) return price;
  
  const factor = 1 / tickSize;
  if (roundUp) {
    return Math.ceil(price * factor) / factor;
  } else {
    return Math.floor(price * factor) / factor;
  }
}

export function validateOrderSize(price: number, quantity: number, symbolInfo: any): {
  isValid: boolean;
  reason?: string;
  adjustedQuantity?: number;
} {
  const totalValue = price * quantity;
  
  // Check minimum base size
  if (quantity < symbolInfo.baseMinSize) {
    return {
      isValid: false,
      reason: `Mindestmenge ${symbolInfo.baseMinSize} nicht erreicht (${quantity})`
    };
  }
  
  // Check minimum quote size
  if (totalValue < symbolInfo.quoteMinSize) {
    return {
      isValid: false,
      reason: `Mindest-Handelswert ${symbolInfo.quoteMinSize} nicht erreicht (${totalValue})`
    };
  }
  
  // Check maximum sizes
  if (quantity > symbolInfo.baseMaxSize) {
    return {
      isValid: false,
      reason: `Maximale Menge ${symbolInfo.baseMaxSize} überschritten (${quantity})`
    };
  }
  
  if (totalValue > symbolInfo.quoteMaxSize) {
    return {
      isValid: false,
      reason: `Maximaler Handelswert ${symbolInfo.quoteMaxSize} überschritten (${totalValue})`
    };
  }
  
  // Round quantity to base increment
  const baseIncrement = symbolInfo.baseIncrement;
  if (baseIncrement > 0) {
    const factor = 1 / baseIncrement;
    const adjustedQuantity = Math.floor(quantity * factor) / factor;
    
    if (adjustedQuantity !== quantity) {
      return {
        isValid: true,
        adjustedQuantity
      };
    }
  }
  
  return { isValid: true };
}

// Legacy functions for backward compatibility
export const getCurrentPrice = getPrice;
