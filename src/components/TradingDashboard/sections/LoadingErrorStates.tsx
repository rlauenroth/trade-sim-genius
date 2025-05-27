
import React from 'react';
import PortfolioLoadingCard from '../PortfolioLoadingCard';

interface LoadingErrorStatesProps {
  isFirstTimeAfterSetup: boolean;
  portfolioLoading: boolean;
  livePortfolioLoading: boolean;
  portfolioError: string | null;
  livePortfolioError: string | null;
  apiKeys: any;
  onRetry: (keys: any) => void;
}

const LoadingErrorStates = ({
  isFirstTimeAfterSetup,
  portfolioLoading,
  livePortfolioLoading,
  portfolioError,
  livePortfolioError,
  apiKeys,
  onRetry
}: LoadingErrorStatesProps) => {
  // Show loading state while portfolio is being loaded for first-time users
  if (isFirstTimeAfterSetup && (portfolioLoading || livePortfolioLoading)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PortfolioLoadingCard 
          isLoading={true} 
          onRetry={() => onRetry(apiKeys)}
        />
      </div>
    );
  }

  // Show error state with retry option
  if (isFirstTimeAfterSetup && (portfolioError || livePortfolioError)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PortfolioLoadingCard 
          isLoading={false}
          error={portfolioError || livePortfolioError}
          onRetry={() => onRetry(apiKeys)}
        />
      </div>
    );
  }

  return null;
};

export default LoadingErrorStates;
