
// Main entry point for KuCoin Proxy API - refactored into modules
export { kucoinFetch } from './kucoin/core';
export { setActivityLogger } from './kucoin/core';
export { 
  getPrice, 
  getMarketTickers, 
  getHistoricalCandles, 
  getCurrentPrice,
  setMarketDataActivityLogger 
} from './kucoin/marketData';
export { 
  getAccountBalances,
  setAccountDataActivityLogger 
} from './kucoin/accountData';
export { 
  testProxyConnection,
  setConnectionActivityLogger 
} from './kucoin/connection';

// Initialize activity loggers when main logger is set
import { setMarketDataActivityLogger } from './kucoin/marketData';
import { setAccountDataActivityLogger } from './kucoin/accountData';
import { setConnectionActivityLogger } from './kucoin/connection';
import { ActivityLogger } from './kucoin/types';

export function setActivityLogger(logger: ActivityLogger | null) {
  // This function is re-exported from core, but we also need to set it for other modules
  const { setActivityLogger: setCoreActivityLogger } = require('./kucoin/core');
  setCoreActivityLogger(logger);
  setMarketDataActivityLogger(logger);
  setAccountDataActivityLogger(logger);
  setConnectionActivityLogger(logger);
}
