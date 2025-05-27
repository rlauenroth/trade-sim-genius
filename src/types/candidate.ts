
export interface Candidate {
  symbol: string;
  status: 'screening' | 'analyzed' | 'signal' | 'exit-screening';
  signalType?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  timestamp: number;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  volume?: number;
  change24h?: number;
}
