
import { GetState, SetState } from './actionTypes';

export const createVerificationActions = (get: GetState, set: SetState) => ({
  markBlockVerified: (blockName: string, verified: boolean) => {
    const { blocks, settings } = get();
    
    // Update verification status in both blocks and settings
    const newBlocks = {
      ...blocks,
      [blockName]: {
        ...blocks[blockName],
        verified
      }
    };
    
    const newSettings = { ...settings };
    if (blockName === 'kucoin') {
      newSettings.kucoin.verified = verified;
    } else if (blockName === 'openRouter') {
      newSettings.openRouter.verified = verified;
    } else if (blockName === 'model') {
      newSettings.model.verified = verified;
    }
    
    set({ blocks: newBlocks, settings: newSettings });
  }
});
