
export type CandidateStatus = 
  | 'screening'
  | 'analyzing'
  | 'signal_ready'
  | 'error'
  | 'monitoring_position'
  // Legacy statuses for compatibility
  | 'detected_market_scan'
  | 'screening_stage1_pending'
  | 'screening_stage1_running'
  | 'detail_analysis_pending'
  | 'detail_analysis_running'
  | 'signal_generated'
  | 'trade_execution_pending'
  | 'position_monitoring'
  | 'error_analysis'
  | 'blacklisted'
  | 'completed'
  | 'analyzed'
  | 'signal'
  | 'exit-screening';

export interface Candidate {
  symbol: string;
  status: CandidateStatus;
  signalType?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  timestamp: number;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  volume?: number;
  change24h?: number;
  
  // Enhanced tracking fields
  lastStatusUpdate?: number;
  pipelineStep?: number; // 0-7 for visual progress
  errorReason?: string;
  retryCount?: number;
}

// Simplified pipeline step mapping
export const PIPELINE_STEPS = {
  // Simplified statuses
  'screening': 1,
  'analyzing': 3,
  'signal_ready': 4,
  'error': -1,
  'monitoring_position': 6,
  
  // Legacy compatibility
  'detected_market_scan': 0,
  'screening_stage1_pending': 1,
  'screening_stage1_running': 1,
  'detail_analysis_pending': 2,
  'detail_analysis_running': 3,
  'signal_generated': 4,
  'trade_execution_pending': 5,
  'position_monitoring': 6,
  'completed': 7,
  'error_analysis': -1,
  'blacklisted': -1,
  'analyzed': 3,
  'signal': 4,
  'exit-screening': 6
};

export const PIPELINE_STEP_LABELS = {
  0: 'Market Scan',
  1: 'Screening',
  2: 'Data Loading',
  3: 'AI Analysis',
  4: 'Signal Ready',
  5: 'Executing',
  6: 'Monitoring',
  7: 'Complete'
};
