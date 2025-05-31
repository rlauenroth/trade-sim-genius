
import { Candidate } from '@/types/candidate';
import { Signal } from '@/types/simulation';

export interface AssetPipelineItem {
  symbol: string;
  status: 'screening' | 'analyzed' | 'signal' | 'exit-screening' | 'error';
  signalType?: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  confidenceScore?: number;
  entryPriceSuggestion?: string | number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
  lastUpdated: number;
  isAutoExecuting?: boolean;
}

export interface AssetPipelineMonitorProps {
  candidates: Candidate[];
  availableSignals: Signal[];
  currentSignal: Signal | null;
  portfolioValue?: number;
  isSimulationActive: boolean;
}
