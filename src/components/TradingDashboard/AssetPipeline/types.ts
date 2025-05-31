
import { Candidate } from '@/types/candidate';
import { Signal } from '@/types/simulation';

export interface AssetPipelineItem {
  symbol: string;
  status: Candidate['status'];
  signalType?: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  confidenceScore?: number;
  entryPriceSuggestion?: string | number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
  lastUpdated: number;
  isAutoExecuting?: boolean;
  
  // Enhanced pipeline tracking
  pipelineStep: number;
  statusDescription: string;
  errorDetails?: {
    type: string;
    message: string;
    retryCount: number;
    blacklistedUntil?: number;
  };
  positionInfo?: {
    type: 'BUY' | 'SELL';
    entryPrice: number;
    currentPrice?: number;
    pnl?: number;
    pnlPercentage?: number;
  };
  category?: string;
  isHealthy: boolean;
}

export interface AssetPipelineMonitorProps {
  candidates: Candidate[];
  availableSignals: Signal[];
  currentSignal: Signal | null;
  portfolioValue?: number;
  isSimulationActive: boolean;
  openPositions?: any[];
}

export interface PipelineProgress {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  isError: boolean;
  isComplete: boolean;
}
