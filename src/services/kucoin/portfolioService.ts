
import { PortfolioSnapshot } from '@/types/simReadiness';
import { getAccountBalances } from '@/utils/kucoin/accountData';
import { getPrice } from '@/utils/kucoin/marketData';
import { cacheService } from '../cacheService';
import { ApiCallTracker } from './apiCallTracker';
import { loggingService } from '../loggingService';
import { networkStatusService } from '../networkStatusService';

interface ApiKeys {
  apiKey: string;
  secret: string;
  passphrase: string;
}

interface AssetPriceError {
  currency: string;
  error: string;
  impact: 'low' | 'medium' | 'high';
}

export class PortfolioService {
  private apiCallTracker: ApiCallTracker;
  
  constructor(apiCallTracker: ApiCallTracker) {
    this.apiCallTracker = apiCallTracker;
  }
  
  async fetchPortfolio(apiKeys: ApiKeys | null): Promise<PortfolioSnapshot> {
    const startTime = Date.now();
    console.log('🚀 PortfolioService.fetchPortfolio started');
    
    if (!apiKeys) {
      console.warn('⚠️ No API keys provided, returning empty portfolio');
      return {
        totalValue: 0,
        positions: [],
        cashUSDT: 0,
        fetchedAt: Date.now()
      };
    }

    try {
      // Convert to KuCoin credentials format
      const credentials = {
        kucoinApiKey: apiKeys.apiKey,
        kucoinApiSecret: apiKeys.secret,
        kucoinApiPassphrase: apiKeys.passphrase
      };
      
      console.log('📊 Fetching account balances...');
      // Get account balances - no credentials needed as it uses centralized store
      const balances = await getAccountBalances();
      console.log(`✅ Retrieved ${balances.length} account balances`);
      
      // Track API call
      this.apiCallTracker.trackApiCall('PortfolioService', 'accounts');
      
      // Process balances to calculate USD values
      const positions = [];
      const priceErrors: AssetPriceError[] = [];
      let totalValue = 0;
      let cashUSDT = 0;
      let successfulValueCalculations = 0;
      let totalBalanceCount = 0;
      
      console.log('💰 Processing asset values...');
      
      for (const balance of balances) {
        if (parseFloat(balance.balance) <= 0) continue;
        totalBalanceCount++;
        
        try {
          let usdValue = 0;
          
          if (balance.currency === 'USDT') {
            usdValue = parseFloat(balance.balance);
            cashUSDT = usdValue;
            successfulValueCalculations++;
            console.log(`💵 USDT balance: ${usdValue}`);
          } else {
            const symbol = `${balance.currency}-USDT`;
            console.log(`📈 Getting price for ${symbol}...`);
            
            try {
              const price = await this.getCachedPrice(symbol);
              if (price && price > 0) {
                usdValue = parseFloat(balance.balance) * price;
                successfulValueCalculations++;
                console.log(`✅ ${balance.currency}: ${balance.balance} × $${price} = $${usdValue.toFixed(2)}`);
                // Track the price lookup
                this.apiCallTracker.trackApiCall('PortfolioService', `price-${symbol}`);
              } else {
                throw new Error(`Invalid price received: ${price}`);
              }
            } catch (priceError) {
              const balanceValue = parseFloat(balance.balance);
              const impact = balanceValue > 10 ? 'high' : balanceValue > 1 ? 'medium' : 'low';
              
              priceErrors.push({
                currency: balance.currency,
                error: priceError instanceof Error ? priceError.message : 'Unknown price error',
                impact
              });
              
              console.warn(`⚠️ Price fetch failed for ${balance.currency} (${balanceValue} units):`, priceError);
              // Continue with usdValue = 0 for this asset
            }
          }
          
          positions.push({
            currency: balance.currency,
            balance: parseFloat(balance.balance),
            available: parseFloat(balance.available),
            usdValue: usdValue
          });
          
          totalValue += usdValue;
        } catch (assetError) {
          const errorMessage = assetError instanceof Error ? assetError.message : 'unknown';
          console.error(`❌ Error processing ${balance.currency}:`, assetError);
          loggingService.logError(`Portfolio asset processing failed for ${balance.currency}`, {
            error: errorMessage,
            balance: balance.balance
          });
          
          // Add position with zero value to maintain completeness
          positions.push({
            currency: balance.currency,
            balance: parseFloat(balance.balance),
            available: parseFloat(balance.available),
            usdValue: 0
          });
        }
      }
      
      // Analyze price errors and determine if portfolio is complete enough
      const highImpactErrors = priceErrors.filter(e => e.impact === 'high');
      const mediumImpactErrors = priceErrors.filter(e => e.impact === 'medium');
      
      console.log('📊 Portfolio processing summary:', {
        totalBalances: totalBalanceCount,
        successfulValueCalculations,
        priceErrors: priceErrors.length,
        highImpactErrors: highImpactErrors.length,
        mediumImpactErrors: mediumImpactErrors.length,
        totalValue: totalValue.toFixed(2)
      });
      
      // Determine if the portfolio data is reliable enough
      const completeness = totalBalanceCount > 0 ? successfulValueCalculations / totalBalanceCount : 1;
      const isReliable = completeness >= 0.8 && highImpactErrors.length === 0;
      
      if (!isReliable) {
        const errorDetails = {
          completeness: Math.round(completeness * 100),
          highImpactErrors: highImpactErrors.map(e => e.currency),
          mediumImpactErrors: mediumImpactErrors.map(e => e.currency)
        };
        
        console.error('❌ Portfolio data quality insufficient:', errorDetails);
        loggingService.logError('Portfolio data quality insufficient', errorDetails);
        
        throw new Error(`Portfolio incomplete: ${Math.round(completeness * 100)}% assets valued successfully, ${highImpactErrors.length} high-impact errors`);
      }
      
      if (priceErrors.length > 0) {
        console.warn(`⚠️ Portfolio completed with ${priceErrors.length} minor price errors`);
        loggingService.logEvent('PORTFOLIO_UPDATE', 'Portfolio completed with price errors', {
          errorCount: priceErrors.length,
          errors: priceErrors
        });
      }
      
      // Record successful call
      networkStatusService.recordSuccessfulCall('/accounts');
      
      const portfolio: PortfolioSnapshot = {
        totalValue,
        positions,
        cashUSDT,
        fetchedAt: Date.now()
      };
      
      // Final validation
      const validationResult = this.validatePortfolioSnapshot(portfolio);
      if (!validationResult.isValid) {
        throw new Error(`Portfolio validation failed: ${validationResult.reason}`);
      }
      
      const fetchTime = Date.now() - startTime;
      console.log(`✅ PortfolioService.fetchPortfolio completed in ${fetchTime}ms:`, {
        totalValue: totalValue.toFixed(2),
        positionCount: positions.length,
        cashUSDT: cashUSDT.toFixed(2)
      });
      
      loggingService.logEvent('PORTFOLIO_UPDATE', 'Portfolio fetch successful', {
        totalValue,
        positionCount: positions.length,
        fetchTime,
        completeness: Math.round(completeness * 100)
      });
      
      return portfolio;
    } catch (error) {
      const fetchTime = Date.now() - startTime;
      console.error(`❌ PortfolioService.fetchPortfolio failed after ${fetchTime}ms:`, error);
      loggingService.logError('Portfolio fetch failed', {
        error: error instanceof Error ? error.message : 'unknown',
        fetchTime
      });
      networkStatusService.recordError(error as Error, '/accounts');
      
      // Return empty portfolio instead of throwing to prevent infinite loops
      return {
        totalValue: 0,
        positions: [],
        cashUSDT: 0,
        fetchedAt: Date.now()
      };
    }
  }
  
  private validatePortfolioSnapshot(snapshot: PortfolioSnapshot): { isValid: boolean; reason?: string } {
    if (!snapshot) {
      return { isValid: false, reason: 'Snapshot is null or undefined' };
    }
    
    if (typeof snapshot.totalValue !== 'number' || isNaN(snapshot.totalValue) || snapshot.totalValue < 0) {
      return { isValid: false, reason: 'Invalid totalValue' };
    }
    
    if (!Array.isArray(snapshot.positions)) {
      return { isValid: false, reason: 'Positions is not an array' };
    }
    
    if (typeof snapshot.cashUSDT !== 'number' || isNaN(snapshot.cashUSDT) || snapshot.cashUSDT < 0) {
      return { isValid: false, reason: 'Invalid cashUSDT' };
    }
    
    if (!snapshot.fetchedAt || typeof snapshot.fetchedAt !== 'number' || snapshot.fetchedAt <= 0) {
      return { isValid: false, reason: 'Invalid fetchedAt timestamp' };
    }
    
    return { isValid: true };
  }
  
  async getCachedPrice(symbol: string): Promise<number> {
    const cacheKey = `price_${symbol}`;
    
    // Try to get from cache first
    const cachedPrice = cacheService.get<number>(cacheKey);
    if (cachedPrice !== undefined) {
      console.log(`📋 Using cached price for ${symbol}: $${cachedPrice}`);
      return cachedPrice;
    }
    
    try {
      console.log(`📈 Fetching fresh price for ${symbol}...`);
      // Fetch fresh price using the updated getPrice function
      const price = await getPrice(symbol);
      
      if (!price || price <= 0) {
        throw new Error(`Invalid price received: ${price}`);
      }
      
      // Cache the result for 10 seconds
      cacheService.set(cacheKey, price, 10000);
      console.log(`✅ Fresh price for ${symbol}: $${price} (cached for 10s)`);
      
      return price;
    } catch (error) {
      console.error(`❌ Price fetch failed for ${symbol}:`, error);
      networkStatusService.recordError(error as Error, `/market/orderbook/level1?symbol=${symbol}`);
      throw error;
    }
  }
}
