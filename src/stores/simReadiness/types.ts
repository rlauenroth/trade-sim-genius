
import { SimReadinessStatus, SimReadinessAction } from '@/types/simReadiness';

export interface SimReadinessStoreInterface {
  subscribe(listener: (status: SimReadinessStatus) => void): () => void;
  getStatus(): SimReadinessStatus;
  dispatch(action: SimReadinessAction): void;
  initialize(): void;
  startSimulation(): void;
  stopSimulation(): void;
  destroy(): void;
  forceRefresh(): void;
  getCacheStats(): Record<string, number>;
  getDetailedStatus(): Record<string, any>;
}

export interface TimerManager {
  stopAllTimers(): void;
  startTTLTimer(): void;
  startHealthChecks(): void;
  startPortfolioRefresh(): void;
  startWatchdog(): void;
}
