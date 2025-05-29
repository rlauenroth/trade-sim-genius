
import { Signal } from '@/types/simulation';
import { Candidate } from '@/types/candidate';

export interface AIValidationResult {
  isValid: boolean;
  openRouterApiKey?: string;
  kucoinKeys?: {
    key: string;
    secret: string;
    passphrase: string;
  };
  strategy?: string;
}

export interface SignalGenerationParams {
  portfolioValue: number;
  availableUSDT: number;
  strategy: string;
  openRouterApiKey: string;
  kucoinKeys: {
    key: string;
    secret: string;
    passphrase: string;
  };
}

export interface MarketScreeningResult {
  selectedPairs: string[];
  signals: Signal[];
}
