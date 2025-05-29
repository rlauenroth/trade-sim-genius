
import { loggingService } from './loggingService';

interface PinData {
  hash: string;
  salt: string;
  attempts: number;
  lockedUntil?: number;
}

const PIN_STORAGE_KEY = 'kiTradingApp_realTradingPin';
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

class PinService {
  private async hashPin(pin: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateSalt(): string {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, dec => dec.toString(16)).join('');
  }

  private getPinData(): PinData | null {
    try {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      loggingService.logError('Failed to read PIN data', { error });
      return null;
    }
  }

  private savePinData(data: PinData): void {
    try {
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      loggingService.logError('Failed to save PIN data', { error });
    }
  }

  async setupPin(pin: string): Promise<boolean> {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    try {
      const salt = this.generateSalt();
      const hash = await this.hashPin(pin, salt);
      
      const pinData: PinData = {
        hash,
        salt,
        attempts: 0
      };

      this.savePinData(pinData);
      loggingService.logEvent('SIM', 'Real trading PIN setup completed');
      return true;
    } catch (error) {
      loggingService.logError('PIN setup failed', { error });
      return false;
    }
  }

  async verifyPin(pin: string): Promise<{ success: boolean; attemptsLeft?: number; lockedUntil?: number }> {
    const pinData = this.getPinData();
    
    if (!pinData) {
      throw new Error('No PIN configured');
    }

    // Check if account is locked
    if (pinData.lockedUntil && Date.now() < pinData.lockedUntil) {
      return { 
        success: false, 
        lockedUntil: pinData.lockedUntil 
      };
    }

    try {
      const hash = await this.hashPin(pin, pinData.salt);
      
      if (hash === pinData.hash) {
        // Reset attempts on successful verification
        pinData.attempts = 0;
        delete pinData.lockedUntil;
        this.savePinData(pinData);
        
        loggingService.logEvent('SIM', 'Real trading PIN verified successfully');
        return { success: true };
      } else {
        // Increment attempts
        pinData.attempts += 1;
        
        if (pinData.attempts >= MAX_ATTEMPTS) {
          pinData.lockedUntil = Date.now() + LOCKOUT_DURATION;
          loggingService.logEvent('SIM', 'Real trading PIN locked due to too many attempts');
        }
        
        this.savePinData(pinData);
        
        return { 
          success: false, 
          attemptsLeft: Math.max(0, MAX_ATTEMPTS - pinData.attempts),
          lockedUntil: pinData.lockedUntil
        };
      }
    } catch (error) {
      loggingService.logError('PIN verification failed', { error });
      return { success: false };
    }
  }

  hasPinConfigured(): boolean {
    return this.getPinData() !== null;
  }

  resetPin(): void {
    localStorage.removeItem(PIN_STORAGE_KEY);
    loggingService.logEvent('SIM', 'Real trading PIN reset');
  }

  isLocked(): boolean {
    const pinData = this.getPinData();
    return pinData?.lockedUntil ? Date.now() < pinData.lockedUntil : false;
  }

  getLockoutTimeRemaining(): number {
    const pinData = this.getPinData();
    if (!pinData?.lockedUntil) return 0;
    return Math.max(0, pinData.lockedUntil - Date.now());
  }
}

export const pinService = new PinService();
