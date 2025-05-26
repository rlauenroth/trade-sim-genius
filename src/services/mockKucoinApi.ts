
// Mock KuCoin API service to replace real API calls due to CORS restrictions
// This provides realistic test data for the trading simulation

interface MockMarketTicker {
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

interface MockAccountBalance {
  currency: string;
  balance: string;
  available: string;
  holds: string;
}

interface MockCandle {
  time: string;
  open: string;
  close: string;
  high: string;
  low: string;
  volume: string;
  turnover: string;
}

// Generate realistic mock market data
const generateMockTickers = (): MockMarketTicker[] => {
  const cryptos = [
    { symbol: 'BTC-USDT', price: 60000, change: 0.025 },
    { symbol: 'ETH-USDT', price: 3000, change: 0.032 },
    { symbol: 'SOL-USDT', price: 150, change: 0.045 },
    { symbol: 'ADA-USDT', price: 0.45, change: -0.012 },
    { symbol: 'DOT-USDT', price: 8.5, change: 0.018 },
    { symbol: 'MATIC-USDT', price: 0.85, change: 0.025 },
    { symbol: 'LINK-USDT', price: 15.2, change: -0.008 },
    { symbol: 'UNI-USDT', price: 7.8, change: 0.042 }
  ];

  return cryptos.map(crypto => {
    const variance = (Math.random() - 0.5) * 0.1;
    const currentPrice = crypto.price * (1 + variance);
    const volume = Math.random() * 10000000 + 1000000;
    
    return {
      symbol: crypto.symbol,
      name: crypto.symbol.replace('-USDT', ''),
      buy: (currentPrice * 0.999).toFixed(2),
      sell: (currentPrice * 1.001).toFixed(2),
      last: currentPrice.toFixed(2),
      vol: (volume / currentPrice).toFixed(2),
      volValue: volume.toFixed(2),
      changeRate: (crypto.change + variance * 0.5).toFixed(4),
      changePrice: (currentPrice * (crypto.change + variance * 0.5)).toFixed(2),
      high: (currentPrice * 1.05).toFixed(2),
      low: (currentPrice * 0.95).toFixed(2)
    };
  });
};

// Generate mock historical candles
const generateMockCandles = (symbol: string, count: number = 288): MockCandle[] => {
  const basePrice = symbol.includes('BTC') ? 60000 : symbol.includes('ETH') ? 3000 : 150;
  const candles: MockCandle[] = [];
  let currentPrice = basePrice;
  
  for (let i = count; i > 0; i--) {
    const variance = (Math.random() - 0.5) * 0.02;
    const open = currentPrice;
    const close = currentPrice * (1 + variance);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.random() * 100 + 10;
    
    candles.unshift({
      time: (Date.now() - i * 5 * 60 * 1000).toString(),
      open: open.toFixed(2),
      close: close.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      volume: volume.toFixed(6),
      turnover: (volume * ((open + close) / 2)).toFixed(2)
    });
    
    currentPrice = close;
  }
  
  return candles;
};

// Generate mock account balances
const generateMockBalances = (): MockAccountBalance[] => {
  return [
    {
      currency: 'USDT',
      balance: '10000.00',
      available: '10000.00',
      holds: '0.00'
    },
    {
      currency: 'BTC',
      balance: '0.1',
      available: '0.1',
      holds: '0.00'
    },
    {
      currency: 'ETH',
      balance: '2.5',
      available: '2.5',
      holds: '0.00'
    }
  ];
};

// Mock API functions that replace the real KuCoin API calls
export const mockKucoinApi = {
  getMarketTickers: async (): Promise<MockMarketTicker[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return generateMockTickers();
  },

  getAccountBalances: async (): Promise<MockAccountBalance[]> => {
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
    return generateMockBalances();
  },

  getHistoricalCandles: async (
    symbol: string,
    type: string = '5min',
    startAt?: number,
    endAt?: number
  ): Promise<MockCandle[]> => {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 150));
    return generateMockCandles(symbol);
  },

  getCurrentPrice: async (symbol: string): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    const tickers = generateMockTickers();
    const ticker = tickers.find(t => t.symbol === symbol);
    return ticker ? parseFloat(ticker.last) : 0;
  },

  getPortfolioSummary: async (): Promise<{
    totalUSDValue: number;
    assets: Array<{
      currency: string;
      balance: number;
      usdValue: number;
    }>;
  }> => {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    const balances = generateMockBalances();
    const assets = [];
    let totalUSDValue = 0;

    for (const balance of balances) {
      const balanceAmount = parseFloat(balance.balance);
      let usdValue = 0;
      
      if (balance.currency === 'USDT') {
        usdValue = balanceAmount;
      } else if (balance.currency === 'BTC') {
        usdValue = balanceAmount * 60000;
      } else if (balance.currency === 'ETH') {
        usdValue = balanceAmount * 3000;
      }
      
      assets.push({
        currency: balance.currency,
        balance: balanceAmount,
        usdValue
      });
      
      totalUSDValue += usdValue;
    }

    return { totalUSDValue, assets };
  }
};
