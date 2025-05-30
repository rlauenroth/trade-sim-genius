
import { z } from 'zod';
import { loggingService } from '@/services/loggingService';
import { VerifiedSettings } from './types';

// Create schemas that match the exact VerifiedSettings interface
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
  tradingStrategy: z.enum(['conservative', 'balanced', 'aggressive']),
  proxyUrl: z.string().url(),
  lastUpdated: z.number()
});

export const validateSettings = (settings: any): { isValid: boolean; settings?: VerifiedSettings; errors?: string[] } => {
  try {
    const validatedSettings = VerifiedSettingsSchema.parse(settings) as VerifiedSettings;
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
    // Build a complete settings object ensuring all required fields are present
    const completeSettings: VerifiedSettings = {
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
    };
    
    loggingService.logInfo('Settings sanitized successfully');
    return completeSettings;
    
  } catch (error) {
    loggingService.logError('Settings sanitization error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Return defaults with updated timestamp as last resort
    return {
      ...defaults,
      lastUpdated: Date.now()
    };
  }
};
