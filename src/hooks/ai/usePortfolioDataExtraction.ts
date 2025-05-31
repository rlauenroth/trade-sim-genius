
import { loggingService } from '@/services/loggingService';

export const usePortfolioDataExtraction = () => {
  // Helper function to extract portfolio data from multiple sources
  const extractPortfolioData = (simulationState: any, livePortfolioData?: any) => {
    loggingService.logEvent('AI', 'Extracting portfolio data for AI analysis', {
      hasSimulationState: !!simulationState,
      hasLivePortfolio: !!livePortfolioData,
      simulationStateKeys: simulationState ? Object.keys(simulationState) : [],
      livePortfolioKeys: livePortfolioData ? Object.keys(livePortfolioData) : []
    });

    // Try to get portfolio value from simulation state first
    let portfolioValue = simulationState?.currentPortfolioValue || simulationState?.startPortfolioValue;
    
    // Fallback to live portfolio data
    if (!portfolioValue && livePortfolioData) {
      portfolioValue = livePortfolioData.totalValue || livePortfolioData.totalUSDValue;
    }

    // Try to get available USDT from simulation state
    let availableUSDT = simulationState?.paperAssets?.find((asset: any) => asset.symbol === 'USDT')?.quantity;
    
    // Fallback: if no paperAssets or USDT not found, use portfolio value as available USDT
    if (!availableUSDT && portfolioValue) {
      availableUSDT = portfolioValue;
      loggingService.logEvent('AI', 'Using portfolio value as available USDT fallback', {
        portfolioValue,
        availableUSDT
      });
    }

    // Fallback to live portfolio USDT position
    if (!availableUSDT && livePortfolioData?.positions) {
      const usdtPosition = livePortfolioData.positions.find((pos: any) => 
        pos.currency === 'USDT' || pos.symbol === 'USDT'
      );
      if (usdtPosition) {
        availableUSDT = usdtPosition.balance || usdtPosition.quantity;
      }
    }

    loggingService.logEvent('AI', 'Portfolio data extraction completed', {
      portfolioValue,
      availableUSDT,
      simulationStateStructure: {
        currentPortfolioValue: simulationState?.currentPortfolioValue,
        startPortfolioValue: simulationState?.startPortfolioValue,
        paperAssetsCount: simulationState?.paperAssets?.length || 0,
        paperAssets: simulationState?.paperAssets?.map((asset: any) => ({
          symbol: asset.symbol,
          quantity: asset.quantity
        })) || []
      }
    });

    return { portfolioValue, availableUSDT };
  };

  return { extractPortfolioData };
};
