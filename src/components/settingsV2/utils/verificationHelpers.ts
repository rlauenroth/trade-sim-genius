
import { VerificationStatus } from '@/types/settingsV2';

export const getVerificationStatus = (
  blockName: string,
  blocks: Record<string, any>,
  verificationHooks: any
): VerificationStatus => {
  if (blocks[blockName]?.verified) return 'success';
  
  switch (blockName) {
    case 'kucoin':
      return verificationHooks.kucoinVerification.isVerifying ? 'testing' : verificationHooks.kucoinVerification.result.status;
    case 'openRouter':
      return verificationHooks.openRouterVerification.isVerifying ? 'testing' : verificationHooks.openRouterVerification.result.status;
    case 'model':
      return verificationHooks.modelVerification.isVerifying ? 'testing' : verificationHooks.modelVerification.result.status;
    case 'proxy':
      return verificationHooks.proxyVerification.isVerifying ? 'testing' : verificationHooks.proxyVerification.result.status;
    default:
      return 'untested';
  }
};

export const getVerificationMessage = (blockName: string, verificationHooks: any): string | undefined => {
  switch (blockName) {
    case 'kucoin':
      return verificationHooks.kucoinVerification.result.message;
    case 'openRouter':
      return verificationHooks.openRouterVerification.result.message;
    case 'model':
      return verificationHooks.modelVerification.result.message;
    case 'proxy':
      return verificationHooks.proxyVerification.result.message;
    default:
      return undefined;
  }
};
