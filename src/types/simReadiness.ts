
export type SimReadinessState = 'IDLE' | 'FETCHING' | 'READY' | 'SIM_RUNNING' | 'UNSTABLE';

export interface PortfolioSnapshot {
  positions: Array<{
    currency: string;
    balance: number;
    available: number;
    usdValue: number;
  }>;
  cashUSDT: number;
  totalValue: number;
  fetchedAt: number;
}

export interface SimReadinessStatus {
  state: SimReadinessState;
  reason: string | null;
  snapshotAge: number;
  lastApiPing: number;
  retryCount: number;
  portfolio: PortfolioSnapshot | null;
}

export type SimReadinessAction = 
  | { type: 'INIT' }
  | { type: 'FETCH_SUCCESS'; payload: PortfolioSnapshot }
  | { type: 'FETCH_FAIL'; payload: string }
  | { type: 'API_DOWN'; payload: string }
  | { type: 'AGE_EXCEEDED' }
  | { type: 'API_UP' }
  | { type: 'START_SIMULATION' }
  | { type: 'STOP_SIMULATION' };
