interface LogEntry {
  timestamp: number;
  type: 'API' | 'SIM' | 'AI' | 'TRADE' | 'INFO' | 'SUCCESS' | 'ERROR' | 'AUTO_TRADE' | 'PORTFOLIO_UPDATE' | 'SYSTEM';
  message: string;
  meta?: Record<string, any>;
}

class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private readonly maxEntries = 500;
  private readonly storageKey = 'kiTradingApp_logs';
  private readonly cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  constructor() {
    this.loadFromStorage();
    this.setupAutoCleanup();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        this.logs = Array.isArray(parsedLogs) ? parsedLogs : [];
        this.enforceMaxEntries();
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
      this.logs = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private setupAutoCleanup(): void {
    setInterval(() => {
      this.cleanupOldLogs();
    }, this.cleanupInterval);
  }

  private cleanupOldLogs(): void {
    const cutoff = Date.now() - this.cleanupInterval;
    const initialLength = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    
    if (this.logs.length !== initialLength) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  private enforceMaxEntries(): void {
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(-this.maxEntries);
      this.saveToStorage();
    }
  }

  private addEntry(entry: LogEntry): void {
    this.logs.push(entry);
    this.enforceMaxEntries();
    this.saveToStorage();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  // Public API
  logInfo(message: string, meta?: Record<string, any>): void {
    this.addEntry({
      timestamp: Date.now(),
      type: 'INFO',
      message,
      meta
    });
  }

  logSuccess(message: string, meta?: Record<string, any>): void {
    this.addEntry({
      timestamp: Date.now(),
      type: 'SUCCESS',
      message,
      meta
    });
  }

  logError(message: string, meta?: Record<string, any>): void {
    this.addEntry({
      timestamp: Date.now(),
      type: 'ERROR',
      message,
      meta
    });
  }

  logEvent(type: 'API' | 'SIM' | 'AI' | 'TRADE' | 'AUTO_TRADE' | 'PORTFOLIO_UPDATE' | 'SYSTEM', message: string, meta?: Record<string, any>): void {
    this.addEntry({
      timestamp: Date.now(),
      type,
      message,
      meta
    });
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByType(type: LogEntry['type']): LogEntry[] {
    return this.logs.filter(log => log.type === type);
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.logs]); // Send current logs immediately
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  clearAllLogs(): void {
    this.logs = [];
    this.saveToStorage();
    this.notifyListeners();
    console.log('🗑️ All logs cleared on app start');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getStats(): { total: number; byType: Record<string, number> } {
    const byType = this.logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.logs.length,
      byType
    };
  }
}

export const loggingService = LoggingService.getInstance();
