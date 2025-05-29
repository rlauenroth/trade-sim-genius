
import { VerifiedSettings } from './types';
import { SettingsV2Actions, GetState, SetState } from './actionTypes';
import { createLoadActions } from './loadActions';
import { createUpdateActions } from './updateActions';
import { createVerificationActions } from './verificationActions';
import { createSaveActions } from './saveActions';

export type { SettingsV2Actions } from './actionTypes';

export const createSettingsV2Actions = (
  get: GetState,
  set: SetState
): SettingsV2Actions => ({
  ...createLoadActions(get, set),
  ...createUpdateActions(get, set),
  ...createVerificationActions(get, set),
  ...createSaveActions(get, set)
});
