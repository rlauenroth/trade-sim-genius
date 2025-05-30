
import { z } from 'zod';
import { loggingService } from '@/services/loggingService';

const KuCoinSettingsSchema = z.object({
  key: z.string().default(''),
  secret: z.string().default(''),
  passphrase: z.string().default(''),
  verified: z.boolean().default(false)
});

const OpenRouterSettingsSchema = z.object({
  apiKey: z.string().default(''),
  verified: z.boolean().default(false)
});

const ModelSettingsSchema = z.object({
  id: z.string().default(''),
  provider: z.string().default(''),
  priceUsdPer1k: z.number().default(0),
  latencyMs: z.number().default(0),
  verified: z.boolean().default(false)
});

const RiskLimitsSchema = z.object({
  maxOpenOrders: z.number().min(1).max(50).default(5),
  maxExposure: z.number().min(100).max(1000000).default(1000),
  minBalance: z.number().min(10).max(10000).default(100),
  requireConfirmation: z.boolean().default(true)
});

const VerifiedSettingsSchema = z.object({
  kucoin: KuCoinSettingsSchema,
  openRouter: OpenRouterSettingsSchema,
  model: ModelSettingsSchema,
  riskLimits: RiskLimitsSchema,
  tradingMode: z.enum(['simulation', 'real']).default('simulation'),
  tradingStrategy: z.enum(['conservative', 'moderate', 'aggressive']).default('conservative'),
  proxyUrl: z.string().url().default('https://api.kucoin.com'),
  lastUpdated: z.number().default(() => Date.now())
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

export const sanitizeSettings = (settings: any, defaults: any): ValidatedSettings => {
  try {
    // First try to validate with defaults applied
    const mergedSettings = {
      ...defaults,
      ...settings,
      kucoin: {
        ...defaults.kucoin,
        ...(settings.kucoin || {})
      },
      openRouter: {
        ...defaults.openRouter,
        ...(settings.openRouter || {})
      },
      model: {
        ...defaults.model,
        ...(settings.model || {})
      },
      riskLimits: {
        ...defaults.riskLimits,
        ...(settings.riskLimits || {})
      },
      lastUpdated: Date.now()
    };
    
    const validation = validateSettings(mergedSettings);
    if (validation.isValid && validation.settings) {
      loggingService.logInfo('Settings sanitized successfully');
      return validation.settings;
    }
    
    // If still invalid, return parsed defaults
    const defaultValidation = validateSettings(defaults);
    if (defaultValidation.isValid && defaultValidation.settings) {
      loggingService.logError('Settings could not be sanitized, using validated defaults');
      return defaultValidation.settings;
    }
    
    // Fallback to schema defaults
    loggingService.logError('Critical: Could not validate defaults, using schema defaults');
    return VerifiedSettingsSchema.parse({});
    
  } catch (error) {
    loggingService.logError('Settings sanitization error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Return schema defaults as last resort
    return VerifiedSettingsSchema.parse({});
  }
};
