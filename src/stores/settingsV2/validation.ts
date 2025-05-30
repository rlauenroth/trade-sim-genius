
import { z } from 'zod';
import { loggingService } from '@/services/loggingService';

const KuCoinSettingsSchema = z.object({
  key: z.string(),
  secret: z.string(),
  passphrase: z.string(),
  verified: z.boolean()
});

const OpenRouterSettingsSchema = z.object({
  apiKey: z.string(),
  verified: z.boolean()
});

const ModelSettingsSchema = z.object({
  id: z.string(),
  provider: z.string(),
  priceUsdPer1k: z.number(),
  latencyMs: z.number(),
  verified: z.boolean()
});

const RiskLimitsSchema = z.object({
  maxOpenOrders: z.number().min(1).max(50),
  maxExposure: z.number().min(100).max(1000000),
  minBalance: z.number().min(10).max(10000),
  requireConfirmation: z.boolean()
});

const VerifiedSettingsSchema = z.object({
  kucoin: KuCoinSettingsSchema,
  openRouter: OpenRouterSettingsSchema,
  model: ModelSettingsSchema,
  riskLimits: RiskLimitsSchema,
  tradingMode: z.enum(['simulation', 'real']),
  tradingStrategy: z.enum(['conservative', 'moderate', 'aggressive']),
  proxyUrl: z.string().url(),
  lastUpdated: z.number()
});

export type ValidatedSettings = z.infer<typeof VerifiedSettingsSchema>;

export const validateSettings = (settings: any): { isValid: boolean; settings?: ValidatedSettings; errors?: string[] } => {
  try {
    const validatedSettings = VerifiedSettingsSchema.parse(settings);
    return { isValid: true, settings: validatedSettings };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      loggingService.logError('Settings validation failed', { errors });
      return { isValid: false, errors };
    }
    
    loggingService.logError('Settings validation error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return { isValid: false, errors: ['Unknown validation error'] };
  }
};

export const sanitizeSettings = (settings: any, defaults: any): any => {
  try {
    // First try to validate
    const validation = validateSettings(settings);
    if (validation.isValid && validation.settings) {
      return validation.settings;
    }
    
    // If validation fails, merge with defaults and validate again
    const mergedSettings = {
      ...defaults,
      ...settings,
      riskLimits: {
        ...defaults.riskLimits,
        ...(settings.riskLimits || {})
      },
      lastUpdated: Date.now()
    };
    
    const secondValidation = validateSettings(mergedSettings);
    if (secondValidation.isValid && secondValidation.settings) {
      loggingService.logInfo('Settings sanitized successfully');
      return secondValidation.settings;
    }
    
    // If still invalid, return defaults
    loggingService.logError('Settings could not be sanitized, using defaults');
    return defaults;
  } catch (error) {
    loggingService.logError('Settings sanitization error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return defaults;
  }
};
