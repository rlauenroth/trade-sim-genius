
import { z } from 'zod';
import { AIParsingError, AIHallucinationError } from '@/utils/errors/aiErrors';
import { loggingService } from '@/services/loggingService';

// Enhanced validation schemas
const ScreeningResponseSchema = z.object({
  selected_pairs: z.array(z.string()).min(1).max(10),
  reasoning: z.string().optional(),
  market_conditions: z.string().optional()
});

const DetailedSignalSchema = z.object({
  asset_pair: z.string(),
  signal_type: z.enum(['BUY', 'SELL', 'HOLD', 'NO_TRADE']),
  entry_price_suggestion: z.union([z.string(), z.number()]),
  take_profit_price: z.number().min(0),
  stop_loss_price: z.number().min(0),
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
  suggested_position_size_percent: z.number().min(0).max(1)
});

export interface ValidationResult {
  isValid: boolean;
  data?: any;
  error?: string;
  usedFallback?: boolean;
}

export class AIResponseValidator {
  private static instance: AIResponseValidator;
  
  static getInstance(): AIResponseValidator {
    if (!AIResponseValidator.instance) {
      AIResponseValidator.instance = new AIResponseValidator();
    }
    return AIResponseValidator.instance;
  }

  validateScreeningResponse(response: string, expectedSymbols: string[]): ValidationResult {
    const parseResult = this.parseAIResponse(response, 'screening');
    
    if (!parseResult.isValid) {
      return {
        isValid: false,
        error: parseResult.error,
        data: this.getScreeningFallback(expectedSymbols),
        usedFallback: true
      };
    }

    try {
      const validated = ScreeningResponseSchema.parse(parseResult.data);
      
      // Check for hallucination
      const invalidPairs = validated.selected_pairs.filter(pair => 
        !expectedSymbols.includes(pair)
      );
      
      if (invalidPairs.length > 0) {
        throw new AIHallucinationError(invalidPairs[0], expectedSymbols);
      }

      return {
        isValid: true,
        data: validated,
        usedFallback: false
      };
    } catch (error) {
      if (error instanceof AIHallucinationError) {
        loggingService.logError('AI hallucination in screening', {
          invalidPairs: error.detectedSymbol,
          expectedSymbols: expectedSymbols.slice(0, 5)
        });
      }

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        data: this.getScreeningFallback(expectedSymbols),
        usedFallback: true
      };
    }
  }

  validateDetailedSignal(response: string, expectedSymbol: string): ValidationResult {
    const parseResult = this.parseAIResponse(response, 'detail');
    
    if (!parseResult.isValid) {
      return {
        isValid: false,
        error: parseResult.error,
        data: this.getDetailSignalFallback(expectedSymbol),
        usedFallback: true
      };
    }

    try {
      let validated = DetailedSignalSchema.parse(parseResult.data);
      
      // Check for hallucination
      if (validated.asset_pair !== expectedSymbol) {
        throw new AIHallucinationError(validated.asset_pair, [expectedSymbol]);
      }

      // Auto-fix extreme values
      validated = this.sanitizeSignalValues(validated);

      return {
        isValid: true,
        data: validated,
        usedFallback: false
      };
    } catch (error) {
      if (error instanceof AIHallucinationError) {
        loggingService.logError('AI hallucination in detail signal', {
          detectedSymbol: error.detectedSymbol,
          expectedSymbol
        });
      }

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        data: this.getDetailSignalFallback(expectedSymbol),
        usedFallback: true
      };
    }
  }

  private parseAIResponse(response: string, type: 'screening' | 'detail'): ValidationResult {
    if (!response || typeof response !== 'string') {
      return {
        isValid: false,
        error: 'Empty or invalid response'
      };
    }

    // Stage 1: Direct JSON parse
    try {
      const data = JSON.parse(response);
      return { isValid: true, data };
    } catch (error) {
      // Continue to next stage
    }

    // Stage 2: Extract from markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        const data = JSON.parse(codeBlockMatch[1]);
        return { isValid: true, data };
      } catch (error) {
        // Continue to next stage
      }
    }

    // Stage 3: Regex fallback for JSON-like structures
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const cleaned = this.cleanJsonString(jsonMatch[0]);
        const data = JSON.parse(cleaned);
        return { isValid: true, data };
      } catch (error) {
        // Continue to next stage
      }
    }

    // Stage 4: Field extraction via regex
    if (type === 'detail') {
      const extracted = this.extractFieldsFromText(response);
      if (extracted) {
        return { isValid: true, data: extracted };
      }
    }

    return {
      isValid: false,
      error: 'Failed to parse AI response at all stages'
    };
  }

  private cleanJsonString(jsonStr: string): string {
    return jsonStr
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .trim();
  }

  private extractFieldsFromText(text: string): any | null {
    try {
      const patterns = {
        signal_type: /(?:signal[_\s]*type|action)[:\s]*([A-Z_]+)/i,
        confidence_score: /confidence[:\s]*([0-9.]+)/i,
        asset_pair: /(?:asset[_\s]*pair|symbol)[:\s]*([A-Z-]+)/i,
        reasoning: /reasoning[:\s]*["\']?([^"\n]+)["\']?/i
      };

      const extracted: any = {};
      let foundFields = 0;

      Object.entries(patterns).forEach(([key, pattern]) => {
        const match = text.match(pattern);
        if (match) {
          let value: any = match[1].trim();
          if (key === 'confidence_score') {
            value = Math.min(1, Math.max(0, parseFloat(value) || 0));
          }
          extracted[key] = value;
          foundFields++;
        }
      });

      return foundFields >= 2 ? extracted : null;
    } catch (error) {
      return null;
    }
  }

  private sanitizeSignalValues(signal: any): any {
    // Clamp confidence score
    signal.confidence_score = Math.min(1, Math.max(0, signal.confidence_score));
    
    // Clamp position size
    signal.suggested_position_size_percent = Math.min(1, Math.max(0, signal.suggested_position_size_percent));
    
    // Validate stop loss (max 10% from entry)
    if (signal.stop_loss_price > 0) {
      const maxStopLoss = 0.1; // 10%
      if (Math.abs(signal.stop_loss_price - 1) > maxStopLoss) {
        signal.stop_loss_price = signal.signal_type === 'BUY' ? 0.95 : 1.05;
        loggingService.logEvent('AI', 'Stop loss clamped to safe value', {
          assetPair: signal.asset_pair,
          originalValue: signal.stop_loss_price
        });
      }
    }
    
    return signal;
  }

  private getScreeningFallback(expectedSymbols: string[]): any {
    const fallbackPairs = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
    const availablePairs = fallbackPairs.filter(pair => expectedSymbols.includes(pair));
    
    return {
      selected_pairs: availablePairs.length > 0 ? availablePairs : expectedSymbols.slice(0, 3),
      reasoning: 'Fallback selection due to AI parsing failure',
      market_conditions: 'Unable to analyze due to technical issues'
    };
  }

  private getDetailSignalFallback(assetPair: string): any {
    return {
      asset_pair: assetPair,
      signal_type: 'HOLD',
      entry_price_suggestion: 'MARKET',
      take_profit_price: 0,
      stop_loss_price: 0,
      confidence_score: 0.3,
      reasoning: 'Auto-generated due to AI parsing failure - holding position for safety',
      suggested_position_size_percent: 0
    };
  }
}

export const aiResponseValidator = AIResponseValidator.getInstance();
