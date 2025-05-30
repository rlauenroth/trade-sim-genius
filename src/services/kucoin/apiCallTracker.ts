
interface ApiCall {
  source: string;
  timestamp: number;
  endpoint: string;
}

export class ApiCallTracker {
  private apiCallTracker: ApiCall[] = [];

  track(source: string, endpoint: string): void {
    const now = Date.now();
    this.apiCallTracker.push({ source, timestamp: now, endpoint });
    
    // Keep only last 10 minutes of calls
    this.apiCallTracker = this.apiCallTracker.filter(call => now - call.timestamp < 600000);
    
    console.log(`📊 API Call tracked: ${source} -> ${endpoint}`);
    console.log(`📊 Recent API calls (last 10min): ${this.apiCallTracker.length}`);
    
    // Log detailed breakdown
    const breakdown = this.apiCallTracker.reduce((acc, call) => {
      const key = `${call.source}-${call.endpoint}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 API call breakdown:', breakdown);
  }

  // Legacy method name for backward compatibility
  trackApiCall(source: string, endpoint: string): void {
    this.track(source, endpoint);
  }

  getApiCallTracker(): ApiCall[] {
    return [...this.apiCallTracker];
  }

  getApiCallsCount(): number {
    return this.apiCallTracker.length;
  }

  clear(): void {
    this.apiCallTracker = [];
  }
}
