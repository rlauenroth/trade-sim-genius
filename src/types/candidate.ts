
export interface Candidate {
  symbol: string;            // e.g. "ETH-USDT"
  status: 'screening' | 'analyzed' | 'signal';
  signalType?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;       // 0-1
  timestamp: number;         // when this status was set
}
