
import { ModelDefinition, ModelProvider, ModelProvidersConfig } from '@/types/settingsV2';
import modelProvidersConfig from '@/config/modelProviders.json';

class ModelProviderService {
  private config: ModelProvidersConfig = modelProvidersConfig;
  private cache: Map<string, { provider: ModelProvider; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  getOptimalProvider(modelId: string): ModelProvider | null {
    // Check cache first
    const cached = this.cache.get(modelId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.provider;
    }

    const model = this.config.models.find(m => m.id === modelId);
    if (!model || model.providers.length === 0) {
      return null;
    }

    // Find cheapest provider, then fastest if price is equal
    const optimal = model.providers.reduce((best, current) => {
      if (current.priceUsdPer1k < best.priceUsdPer1k) {
        return current;
      }
      if (current.priceUsdPer1k === best.priceUsdPer1k && current.latencyMs < best.latencyMs) {
        return current;
      }
      return best;
    });

    // Cache result
    this.cache.set(modelId, {
      provider: optimal,
      timestamp: Date.now()
    });

    return optimal;
  }

  getAllModels(): ModelDefinition[] {
    return this.config.models;
  }

  getDefaultModel(): ModelDefinition | null {
    return this.config.models.find(m => m.isDefault) || this.config.models[0] || null;
  }

  updateProviderPerformance(modelId: string, providerName: string, latencyMs: number): void {
    const model = this.config.models.find(m => m.id === modelId);
    if (model) {
      const provider = model.providers.find(p => p.name === providerName);
      if (provider) {
        provider.latencyMs = latencyMs;
        // Invalidate cache to force recalculation
        this.cache.delete(modelId);
      }
    }
  }
}

export const modelProviderService = new ModelProviderService();
