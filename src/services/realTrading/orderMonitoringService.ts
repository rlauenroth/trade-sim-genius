
import { KuCoinCredentials } from './types';
import { getOrderStatus } from '@/utils/kucoin/trading';
import { loggingService } from '@/services/loggingService';

export class OrderMonitoringService {
  private static instance: OrderMonitoringService;
  private monitoringTimers: Map<string, NodeJS.Timeout> = new Map();
  
  static getInstance(): OrderMonitoringService {
    if (!OrderMonitoringService.instance) {
      OrderMonitoringService.instance = new OrderMonitoringService();
    }
    return OrderMonitoringService.instance;
  }

  startOrderMonitoring(credentials: KuCoinCredentials, orderId: string): void {
    const checkStatus = async () => {
      try {
        const status = await getOrderStatus(credentials, orderId);
        console.log(`Order ${orderId} status:`, status);
        
        if (status?.status === 'done') {
          loggingService.logSuccess(`Order ${orderId} completed successfully`);
          this.stopOrderMonitoring(orderId);
        } else if (status?.status === 'cancelled' || status?.status === 'failed') {
          loggingService.logError(`Order ${orderId} ${status.status}`);
          this.stopOrderMonitoring(orderId);
        } else {
          // Continue monitoring for up to 5 minutes
          const orderAge = Date.now() - parseInt(orderId.substring(0, 13));
          if (orderAge < 300000) { // 5 minutes
            const timeoutId = setTimeout(checkStatus, 5000);
            this.monitoringTimers.set(orderId, timeoutId);
          } else {
            loggingService.logEvent('TRADE', `Order monitoring timeout for ${orderId}`);
            this.stopOrderMonitoring(orderId);
          }
        }
      } catch (error) {
        console.error('Error checking order status:', error);
        loggingService.logError(`Failed to check order status: ${orderId}`, {
          error: error instanceof Error ? error.message : 'unknown'
        });
        this.stopOrderMonitoring(orderId);
      }
    };

    // Start monitoring after 2 seconds
    const initialTimeoutId = setTimeout(checkStatus, 2000);
    this.monitoringTimers.set(orderId, initialTimeoutId);
  }

  stopOrderMonitoring(orderId: string): void {
    const timeoutId = this.monitoringTimers.get(orderId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.monitoringTimers.delete(orderId);
    }
  }

  stopAllMonitoring(): void {
    for (const [orderId, timeoutId] of this.monitoringTimers) {
      clearTimeout(timeoutId);
    }
    this.monitoringTimers.clear();
  }
}
