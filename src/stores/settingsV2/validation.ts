
import { z } from 'zod';
import { loggingService } from '@/services/loggingService';
import { VerifiedSettings } from './types';

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
  tradingStrategy: z.enum(['conservative', 'balanced', 'aggressive']).default('conservative'),
  proxyUrl: z.string().url().default('https://api.kucoin.com'),
  lastUpdated: z.number().default(() => Date.now())
});

export const validateSettings = (settings: any): { isValid: boolean; settings?: VerifiedSettings; errors?: string[] } => {
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

export const sanitizeSettings = (settings: any, defaults: VerifiedSettings): VerifiedSettings => {
  try {
    // Use Zod's parse method with defaults to ensure all required fields are present
    const settingsWithDefaults = VerifiedSettingsSchema.parse({
      kucoin: {
        key: settings?.kucoin?.key ?? defaults.kucoin.key,
        secret: settings?.kucoin?.secret ?? defaults.kucoin.secret,
        passphrase: settings?.kucoin?.passphrase ?? defaults.kucoin.passphrase,
        verified: settings?.kucoin?.verified ?? defaults.kucoin.verified
      },
      openRouter: {
        apiKey: settings?.openRouter?.apiKey ?? defaults.openRouter.apiKey,
        verified: settings?.openRouter?.verified ?? defaults.openRouter.verified
      },
      model: {
        id: settings?.model?.id ?? defaults.model.id,
        provider: settings?.model?.provider ?? defaults.model.provider,
        priceUsdPer1k: settings?.model?.priceUsdPer1k ?? defaults.model.priceUsdPer1k,
        latencyMs: settings?.model?.latencyMs ?? defaults.model.latencyMs,
        verified: settings?.model?.verified ?? defaults.model.verified
      },
      riskLimits: {
        maxOpenOrders: settings?.riskLimits?.maxOpenOrders ?? defaults.riskLimits.maxOpenOrders,
        maxExposure: settings?.riskLimits?.maxExposure ?? defaults.riskLimits.maxExposure,
        minBalance: settings?.riskLimits?.minBalance ?? defaults.riskLimits.minBalance,
        requireConfirmation: settings?.riskLimits?.requireConfirmation ?? defaults.riskLimits.requireConfirmation
      },
      tradingMode: settings?.tradingMode ?? defaults.tradingMode,
      tradingStrategy: settings?.tradingStrategy ?? defaults.tradingStrategy,
      proxyUrl: settings?.proxyUrl ?? defaults.proxyUrl,
      lastUpdated: Date.now()
    });
    
    loggingService.logInfo('Settings sanitized successfully');
    return settingsWithDefaults;
    
  } catch (error) {
    loggingService.logError('Settings sanitization error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Return defaults as last resort, parsed through schema to ensure type safety
    return VerifiedSettingsSchema.parse(defaults);
  }
};
