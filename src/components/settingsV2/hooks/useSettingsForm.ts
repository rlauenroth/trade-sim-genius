
import { useState, useEffect } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';

export const useSettingsForm = () => {
  const { settings, updateBlock } = useSettingsV2Store();

  const [formData, setFormData] = useState({
    kucoinKey: '',
    kucoinSecret: '',
    kucoinPassphrase: '',
    openRouterKey: '',
    modelId: '',
    proxyUrl: ''
  });

  // Initialize form data from settings
  useEffect(() => {
    setFormData({
      kucoinKey: settings.kucoin.key,
      kucoinSecret: settings.kucoin.secret,
      kucoinPassphrase: settings.kucoin.passphrase,
      openRouterKey: settings.openRouter.apiKey,
      modelId: settings.model.id,
      proxyUrl: settings.proxyUrl
    });
  }, [settings]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update store and mark block as modified
    if (field.startsWith('kucoin')) {
      const kucoinField = field.replace('kucoin', '').toLowerCase();
      updateBlock('kucoin', {
        kucoin: {
          ...settings.kucoin,
          [kucoinField === 'key' ? 'key' : kucoinField === 'secret' ? 'secret' : 'passphrase']: value
        }
      });
    } else if (field === 'openRouterKey') {
      updateBlock('openRouter', {
        openRouter: { ...settings.openRouter, apiKey: value }
      });
    } else if (field === 'modelId') {
      const provider = modelProviderService.getOptimalProvider(value);
      if (provider) {
        updateBlock('model', {
          model: {
            id: value,
            provider: provider.name,
            priceUsdPer1k: provider.priceUsdPer1k,
            latencyMs: provider.latencyMs,
            verified: false
          }
        });
      }
    } else if (field === 'proxyUrl') {
      updateBlock('proxy', { proxyUrl: value });
    }
  };

  return {
    formData,
    handleFieldChange
  };
};
