
import { Position } from '@/types/simulation';
import { AISignalService } from '@/services/aiSignal';
import { loggingService } from '@/services/loggingService';
import { ApiKeys } from '@/types/appState';

export class ExitScreeningService {
  async analyzePositionForExit(
    position: Position,
    strategy: string,
    apiKeys: ApiKeys
  ): Promise<'SELL' | 'HOLD'> {
    try {
      loggingService.logEvent('AI', 'Analyzing position for exit', {
        positionId: position.id,
        assetPair: position.assetPair,
        entryPrice: position.entryPrice,
        currentPnL: position.unrealizedPnL
      });

      const aiService = new AISignalService({
        kucoinCredentials: {
          kucoinApiKey: apiKeys.kucoin.key,
          kucoinApiSecret: apiKeys.kucoin.secret,
          kucoinApiPassphrase: apiKeys.kucoin.passphrase
        },
        openRouterApiKey: apiKeys.openRouter,
        strategy,
        simulatedPortfolioValue: 1000,
        availableUSDT: 0
      });

      const signal = await aiService.generateDetailedSignal(position.assetPair);
      
      if (!signal) {
        loggingService.logEvent('AI', 'No signal generated, holding position', {
          positionId: position.id,
          assetPair: position.assetPair
        });
        return 'HOLD';
      }

      const shouldExit = (
        (position.type === 'BUY' && signal.signalType === 'SELL') ||
        (position.type === 'SELL' && signal.signalType === 'BUY')
      );

      const decision = shouldExit ? 'SELL' : 'HOLD';

      loggingService.logEvent('AI', 'Exit analysis completed', {
        positionId: position.id,
        assetPair: position.assetPair,
        positionType: position.type,
        signalType: signal.signalType,
        decision,
        confidence: signal.confidenceScore
      });

      return decision;
    } catch (error) {
      loggingService.logError('Exit screening analysis failed', {
        positionId: position.id,
        assetPair: position.assetPair,
        error: error instanceof Error ? error.message : 'unknown'
      });
      return 'HOLD';
    }
  }
}
