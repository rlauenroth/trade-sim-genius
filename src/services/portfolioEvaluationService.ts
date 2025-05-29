
import { Position, PaperAsset, SimulationState } from '@/types/simulation';
import { kucoinService } from './kucoinService';
import { loggingService } from './loggingService';

interface PositionEvaluation {
  positionId: string;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  currentValue: number;
}

interface PortfolioEvaluation {
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  positions: PositionEvaluation[];
  lastUpdated: number;
}

export class PortfolioEvaluationService {
  private static instance: PortfolioEvaluationService;
  private evaluationCache: Map<string, PositionEvaluation> = new Map();
  private lastFullEvaluation: number = 0;
  private readonly EVALUATION_INTERVAL = 30000; // 30 seconds

  static getInstance(): PortfolioEvaluationService {
    if (!PortfolioEvaluationService.instance) {
      PortfolioEvaluationService.instance = new PortfolioEvaluationService();
    }
    return PortfolioEvaluationService.instance;
  }

  async evaluatePosition(position: Position): Promise<PositionEvaluation> {
    try {
      // Check cache first
      const cached = this.evaluationCache.get(position.id);
      if (cached && (Date.now() - this.lastFullEvaluation) < this.EVALUATION_INTERVAL) {
        return cached;
      }

      const symbol = position.assetPair.replace('/', '-');
      const currentPrice = await kucoinService.getCachedPrice(symbol);
      
      let unrealizedPnL: number;
      if (position.type === 'BUY') {
        unrealizedPnL = (currentPrice - position.entryPrice) * position.quantity;
      } else {
        unrealizedPnL = (position.entryPrice - currentPrice) * position.quantity;
      }

      const unrealizedPnLPercent = (unrealizedPnL / (position.entryPrice * position.quantity)) * 100;
      const currentValue = currentPrice * position.quantity;

      const evaluation: PositionEvaluation = {
        positionId: position.id,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        currentValue
      };

      // Cache the evaluation
      this.evaluationCache.set(position.id, evaluation);
      
      return evaluation;
    } catch (error) {
      loggingService.logError('Position evaluation failed', {
        positionId: position.id,
        assetPair: position.assetPair,
        error: error instanceof Error ? error.message : 'unknown'
      });

      // Return fallback evaluation
      return {
        positionId: position.id,
        currentPrice: position.entryPrice,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        currentValue: position.entryPrice * position.quantity
      };
    }
  }

  async evaluatePortfolio(simulationState: SimulationState): Promise<PortfolioEvaluation> {
    try {
      const now = Date.now();
      
      // Evaluate all open positions
      const positionEvaluations = await Promise.all(
        simulationState.openPositions.map(position => this.evaluatePosition(position))
      );

      // Calculate paper assets value (USDT and crypto holdings)
      let paperAssetsValue = 0;
      for (const asset of simulationState.paperAssets) {
        if (asset.symbol === 'USDT') {
          paperAssetsValue += asset.quantity;
        } else {
          try {
            const symbol = `${asset.symbol}-USDT`;
            const price = await kucoinService.getCachedPrice(symbol);
            paperAssetsValue += asset.quantity * price;
          } catch (error) {
            // Use entry price as fallback
            if (asset.entryPrice) {
              paperAssetsValue += asset.quantity * asset.entryPrice;
            }
          }
        }
      }

      const totalUnrealizedPnL = positionEvaluations.reduce(
        (sum, evaluation) => sum + evaluation.unrealizedPnL,
        0
      );

      const totalValue = paperAssetsValue + totalUnrealizedPnL;

      this.lastFullEvaluation = now;

      const evaluation: PortfolioEvaluation = {
        totalValue,
        unrealizedPnL: totalUnrealizedPnL,
        realizedPnL: simulationState.realizedPnL,
        positions: positionEvaluations,
        lastUpdated: now
      };

      loggingService.logEvent('PORTFOLIO_UPDATE', 'Portfolio evaluation completed', {
        totalValue,
        unrealizedPnL: totalUnrealizedPnL,
        realizedPnL: simulationState.realizedPnL,
        positionsCount: positionEvaluations.length,
        paperAssetsValue
      });

      return evaluation;
    } catch (error) {
      loggingService.logError('Portfolio evaluation failed', {
        error: error instanceof Error ? error.message : 'unknown'
      });

      // Return fallback evaluation
      return {
        totalValue: simulationState.currentPortfolioValue,
        unrealizedPnL: 0,
        realizedPnL: simulationState.realizedPnL,
        positions: [],
        lastUpdated: Date.now()
      };
    }
  }

  clearCache(): void {
    this.evaluationCache.clear();
    this.lastFullEvaluation = 0;
  }

  // Batch update for multiple positions (performance optimization)
  async batchEvaluatePositions(positions: Position[]): Promise<PositionEvaluation[]> {
    const now = Date.now();
    
    // Skip if recent evaluation exists
    if ((now - this.lastFullEvaluation) < this.EVALUATION_INTERVAL) {
      return positions.map(pos => {
        const cached = this.evaluationCache.get(pos.id);
        return cached || {
          positionId: pos.id,
          currentPrice: pos.entryPrice,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          currentValue: pos.entryPrice * pos.quantity
        };
      });
    }

    // Evaluate all positions in parallel
    return Promise.all(positions.map(position => this.evaluatePosition(position)));
  }
}

export const portfolioEvaluationService = PortfolioEvaluationService.getInstance();
