
import { useSignalGeneration } from './ai/useSignalGeneration';
import { useCandidates } from '@/hooks/useCandidates';

export const useAISignals = () => {
  const {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    generateSignals
  } = useSignalGeneration();

  const { candidates } = useCandidates();

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration: generateSignals,
    candidates
  };
};
