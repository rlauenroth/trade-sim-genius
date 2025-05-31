
import { GeneratedSignal } from '@/types/aiSignal';
import { AI_SIGNAL_CONFIG, getAssetCategory } from '@/config/aiSignalConfig';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';
import { loggingService } from '@/services/loggingService';

export class SignalSelector {
  selectDiverseSignals(signals: GeneratedSignal[]): GeneratedSignal[] {
    loggingService.logEvent('AI', 'Selecting diverse signals', {
      totalSignals: signals.length,
      maxConcurrentTrades: AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES,
      preferDiverse: AI_SIGNAL_CONFIG.PREFER_DIVERSE_ASSETS
    });

    const qualifiedSignals = signals.filter(signal => 
      (signal.confidenceScore || 0) >= AI_SIGNAL_CONFIG.MIN_CONFIDENCE_SCORE &&
      (signal.signalType === 'BUY' || signal.signalType === 'SELL') &&
      !candidateErrorManager.isBlacklisted(signal.assetPair)
    );

    loggingService.logEvent('AI', 'Signals filtered by confidence and blacklist', {
      qualifiedSignals: qualifiedSignals.length,
      minConfidence: AI_SIGNAL_CONFIG.MIN_CONFIDENCE_SCORE,
      blacklistedCount: signals.length - qualifiedSignals.length
    });

    if (!AI_SIGNAL_CONFIG.PREFER_DIVERSE_ASSETS) {
      return qualifiedSignals
        .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
        .slice(0, AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES);
    }

    return this.implementDiversitySelection(qualifiedSignals);
  }

  private implementDiversitySelection(qualifiedSignals: GeneratedSignal[]): GeneratedSignal[] {
    const selectedSignals: GeneratedSignal[] = [];
    const categoryCount: Record<string, number> = {};

    const sortedSignals = qualifiedSignals.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

    for (const signal of sortedSignals) {
      if (selectedSignals.length >= AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES) break;

      const category = getAssetCategory(signal.assetPair);
      const currentCategoryCount = categoryCount[category] || 0;

      if (currentCategoryCount < AI_SIGNAL_CONFIG.MAX_SAME_CATEGORY_SIGNALS) {
        selectedSignals.push(signal);
        categoryCount[category] = currentCategoryCount + 1;
      }
    }

    // Fill remaining slots if needed
    if (selectedSignals.length < AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES) {
      const remainingSlots = AI_SIGNAL_CONFIG.MAX_CONCURRENT_TRADES - selectedSignals.length;
      const remainingSignals = sortedSignals.filter(signal => 
        !selectedSignals.some(selected => selected.assetPair === signal.assetPair)
      ).slice(0, remainingSlots);

      selectedSignals.push(...remainingSignals);
    }

    loggingService.logSuccess('Enhanced signal selection completed', {
      totalGenerated: qualifiedSignals.length,
      selected: selectedSignals.length,
      categoryDistribution: categoryCount,
      selectedPairs: selectedSignals.map(s => s.assetPair)
    });

    return selectedSignals;
  }
}
