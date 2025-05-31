
// Legacy compatibility wrapper - use useEnhancedPipelineData instead
import { useEnhancedPipelineData } from './useEnhancedPipelineData';
import { AssetPipelineMonitorProps } from './types';

export const usePipelineData = (props: Pick<AssetPipelineMonitorProps, 'candidates' | 'availableSignals' | 'isSimulationActive'>) => {
  console.warn('usePipelineData is deprecated. Use useEnhancedPipelineData instead.');
  return useEnhancedPipelineData({
    ...props,
    openPositions: []
  });
};
