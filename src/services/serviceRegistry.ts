
import { loggingService } from './loggingService';

interface ServiceStatus {
  name: string;
  initialized: boolean;
  error?: string;
  lastCheck: number;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServiceStatus> = new Map();
  private initializationPromises: Map<string, Promise<boolean>> = new Map();

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  async registerService(
    name: string, 
    initializeFn: () => Promise<boolean>,
    retryAttempts: number = 3
  ): Promise<boolean> {
    // Prevent duplicate initialization
    if (this.initializationPromises.has(name)) {
      return this.initializationPromises.get(name)!;
    }

    const initPromise = this.initializeWithRetry(name, initializeFn, retryAttempts);
    this.initializationPromises.set(name, initPromise);

    try {
      const result = await initPromise;
      this.services.set(name, {
        name,
        initialized: result,
        lastCheck: Date.now()
      });
      
      if (result) {
        loggingService.logSuccess(`Service ${name} initialized successfully`);
      } else {
        loggingService.logError(`Service ${name} failed to initialize`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.services.set(name, {
        name,
        initialized: false,
        error: errorMessage,
        lastCheck: Date.now()
      });
      
      loggingService.logError(`Service ${name} initialization error`, { error: errorMessage });
      return false;
    } finally {
      this.initializationPromises.delete(name);
    }
  }

  private async initializeWithRetry(
    name: string,
    initializeFn: () => Promise<boolean>,
    retryAttempts: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const result = await initializeFn();
        if (result) return true;
        
        if (attempt < retryAttempts) {
          loggingService.logInfo(`Service ${name} initialization attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        if (attempt === retryAttempts) throw error;
        
        loggingService.logInfo(`Service ${name} initialization attempt ${attempt} threw error, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return false;
  }

  getServiceStatus(name: string): ServiceStatus | null {
    return this.services.get(name) || null;
  }

  isServiceReady(name: string): boolean {
    const status = this.services.get(name);
    return status?.initialized === true;
  }

  getAllServicesReady(serviceNames: string[]): boolean {
    return serviceNames.every(name => this.isServiceReady(name));
  }

  getServicesStatus(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  unregisterService(name: string): void {
    this.services.delete(name);
    this.initializationPromises.delete(name);
  }

  clear(): void {
    this.services.clear();
    this.initializationPromises.clear();
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
