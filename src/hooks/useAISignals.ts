
import { useSignalGeneration } from './ai/useSignalGeneration';
import { useCandidates } from '@/hooks/useCandidates';
import { useSettingsV2Store } from '@/stores/settingsV2';

export const useAISignals = () => {
  const {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    generateSignals
  } = useSignalGeneration();

  const { candidates } = useCandidates();
  const { settings } = useSettingsV2Store();

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration: generateSignals,
    candidates,
    selectedModelId: settings.model.id // Expose the selected model ID
  };
};
