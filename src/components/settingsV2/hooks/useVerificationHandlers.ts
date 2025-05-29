
import { useKucoinVerification } from '@/hooks/useKucoinVerification';
import { useOpenRouterVerification } from '@/hooks/useOpenRouterVerification';
import { useModelVerification } from '@/hooks/useModelVerification';
import { useProxyVerification } from '@/hooks/useProxyVerification';
import { useSettingsV2Store } from '@/stores/settingsV2';

export const useVerificationHandlers = (formData: any) => {
  const { markBlockVerified } = useSettingsV2Store();

  const kucoinVerification = useKucoinVerification();
  const openRouterVerification = useOpenRouterVerification();
  const modelVerification = useModelVerification();
  const proxyVerification = useProxyVerification();

  const handleKucoinVerify = async () => {
    kucoinVerification.reset();
    const success = await kucoinVerification.verify(
      formData.kucoinKey,
      formData.kucoinSecret,
      formData.kucoinPassphrase
    );
    markBlockVerified('kucoin', success);
  };

  const handleOpenRouterVerify = async () => {
    openRouterVerification.reset();
    const success = await openRouterVerification.verify(formData.openRouterKey);
    markBlockVerified('openRouter', success);
  };

  const handleModelVerify = async () => {
    modelVerification.reset();
    const success = await modelVerification.verify(formData.modelId, formData.openRouterKey);
    markBlockVerified('model', success);
  };

  const handleProxyVerify = async () => {
    proxyVerification.reset();
    const success = await proxyVerification.verify(formData.proxyUrl);
    markBlockVerified('proxy', success);
  };

  return {
    kucoinVerification,
    openRouterVerification,
    modelVerification,
    proxyVerification,
    handleKucoinVerify,
    handleOpenRouterVerify,
    handleModelVerify,
    handleProxyVerify
  };
};
