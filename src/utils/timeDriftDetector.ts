
import { KUCOIN_PROXY_BASE } from '@/config';

export interface TimeDriftResult {
  localTime: number;
  serverTime: number;
  drift: number;
  isAcceptable: boolean;
}

export async function detectTimeDrift(): Promise<TimeDriftResult> {
  const localTime = Date.now();
  
  try {
    // Use a simple HEAD request to get server time
    const response = await fetch(`${KUCOIN_PROXY_BASE}/api/v1/timestamp`, {
      method: 'HEAD'
    });
    
    const serverTimeHeader = response.headers.get('Date');
    const serverTime = serverTimeHeader ? new Date(serverTimeHeader).getTime() : localTime;
    
    const drift = Math.abs(localTime - serverTime);
    const isAcceptable = drift <= 5000; // 5 seconds tolerance
    
    return {
      localTime,
      serverTime,
      drift,
      isAcceptable
    };
  } catch (error) {
    console.warn('Could not detect time drift:', error);
    
    // Return acceptable if we can't detect
    return {
      localTime,
      serverTime: localTime,
      drift: 0,
      isAcceptable: true
    };
  }
}

export function formatTimeDrift(drift: number): string {
  const seconds = Math.floor(drift / 1000);
  
  if (seconds < 60) {
    return `${seconds} Sekunden`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}m ${remainingSeconds}s`;
}
