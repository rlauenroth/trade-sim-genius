
interface NetworkStatus {
  lastSuccessfulCall: number;
  lastError: string | null;
  isProxyReachable: boolean;
  rateLimitActive: boolean;
  rateLimitRetryAfter: number;
}

class NetworkStatusService {
  private status: NetworkStatus = {
    lastSuccessfulCall: 0,
    lastError: null,
    isProxyReachable: true,
    rateLimitActive: false,
    rateLimitRetryAfter: 0
  };

  private listeners: ((status: NetworkStatus) => void)[] = [];

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  subscribe(listener: (status: NetworkStatus) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  recordSuccessfulCall() {
    this.status.lastSuccessfulCall = Date.now();
    this.status.lastError = null;
    this.status.rateLimitActive = false;
    this.status.rateLimitRetryAfter = 0;
    this.notifyListeners();
  }

  recordError(error: Error) {
    this.status.lastError = error.message;
    
    if (error.name === 'RateLimitError') {
      this.status.rateLimitActive = true;
      this.status.rateLimitRetryAfter = Date.now() + ((error as any).retryAfter * 1000);
    } else if (error.name === 'ProxyError') {
      this.status.isProxyReachable = false;
    }
    
    this.notifyListeners();
  }

  recordProxyStatus(isReachable: boolean) {
    this.status.isProxyReachable = isReachable;
    this.notifyListeners();
  }

  getNetworkBadgeStatus(): 'green' | 'yellow' | 'red' {
    const now = Date.now();
    const timeSinceLastCall = now - this.status.lastSuccessfulCall;
    
    if (!this.status.isProxyReachable || this.status.lastError) {
      return 'red';
    }
    
    if (timeSinceLastCall > 60000) { // > 60s
      return 'red';
    } else if (timeSinceLastCall > 30000) { // > 30s
      return 'yellow';
    }
    
    return 'green';
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getStatus()));
  }
}

export const networkStatusService = new NetworkStatusService();
