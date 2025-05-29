
import { loggingService } from './loggingService';
import { kucoinFetch } from '@/utils/kucoin/core';

interface WebsocketConfig {
  endpoint: string;
  token: string;
  pingInterval: number;
  pingTimeout: number;
}

interface OrderUpdate {
  orderId: string;
  symbol: string;
  status: 'open' | 'match' | 'filled' | 'cancelled';
  side: 'buy' | 'sell';
  size: string;
  price: string;
  filledSize?: string;
  filledFunds?: string;
}

type OrderUpdateCallback = (update: OrderUpdate) => void;

class KuCoinWebsocketService {
  private websocket: WebSocket | null = null;
  private config: WebsocketConfig | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pingInterval: NodeJS.Timeout | null = null;
  private orderUpdateCallbacks: OrderUpdateCallback[] = [];
  private subscribedOrderIds: Set<string> = new Set();

  async connect(): Promise<boolean> {
    try {
      // Get websocket token from KuCoin API
      this.config = await this.getWebsocketConfig();
      
      if (!this.config) {
        throw new Error('Failed to get websocket configuration');
      }

      // Create websocket connection
      this.websocket = new WebSocket(this.config.endpoint);
      
      this.websocket.onopen = this.handleOpen.bind(this);
      this.websocket.onmessage = this.handleMessage.bind(this);
      this.websocket.onclose = this.handleClose.bind(this);
      this.websocket.onerror = this.handleError.bind(this);

      loggingService.logEvent('TRADE', 'KuCoin WebSocket connection initiated');
      return true;
    } catch (error) {
      loggingService.logError('Failed to connect to KuCoin WebSocket', {
        error: error instanceof Error ? error.message : 'unknown'
      });
      return false;
    }
  }

  private async getWebsocketConfig(): Promise<WebsocketConfig | null> {
    try {
      const response = await kucoinFetch('/api/v1/bullet-private', 'POST');
      
      if (response?.data) {
        const { token, instanceServers } = response.data;
        const server = instanceServers[0];
        
        return {
          endpoint: `${server.endpoint}?token=${token}&[connectId=${Date.now()}]`,
          token,
          pingInterval: server.pingInterval || 18000,
          pingTimeout: server.pingTimeout || 10000
        };
      }
      
      return null;
    } catch (error) {
      loggingService.logError('Failed to get WebSocket token', {
        error: error instanceof Error ? error.message : 'unknown'
      });
      return null;
    }
  }

  private handleOpen(): void {
    loggingService.logEvent('TRADE', 'KuCoin WebSocket connected successfully');
    this.reconnectAttempts = 0;
    
    // Start ping interval
    if (this.config && this.config.pingInterval) {
      this.pingInterval = setInterval(() => {
        this.sendPing();
      }, this.config.pingInterval);
    }

    // Subscribe to order updates
    this.subscribeToOrderUpdates();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message' && data.topic === '/spotMarket/tradeOrders') {
        this.handleOrderUpdate(data.data);
      } else if (data.type === 'pong') {
        console.log('WebSocket pong received');
      }
    } catch (error) {
      loggingService.logError('Failed to parse WebSocket message', {
        error: error instanceof Error ? error.message : 'unknown',
        message: event.data
      });
    }
  }

  private handleOrderUpdate(orderData: any): void {
    try {
      const update: OrderUpdate = {
        orderId: orderData.orderId,
        symbol: orderData.symbol,
        status: orderData.status,
        side: orderData.side,
        size: orderData.size,
        price: orderData.price,
        filledSize: orderData.filledSize,
        filledFunds: orderData.filledFunds
      };

      loggingService.logEvent('TRADE', 'Order update received via WebSocket', {
        orderId: update.orderId,
        status: update.status,
        symbol: update.symbol
      });

      // Notify all registered callbacks
      this.orderUpdateCallbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          loggingService.logError('Error in order update callback', {
            error: error instanceof Error ? error.message : 'unknown'
          });
        }
      });
    } catch (error) {
      loggingService.logError('Failed to process order update', {
        error: error instanceof Error ? error.message : 'unknown',
        orderData
      });
    }
  }

  private handleClose(): void {
    loggingService.logEvent('TRADE', 'KuCoin WebSocket connection closed');
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Attempt to reconnect if not manually closed
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      loggingService.logEvent('TRADE', `WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      loggingService.logError('WebSocket max reconnection attempts reached');
    }
  }

  private handleError(error: Event): void {
    loggingService.logError('KuCoin WebSocket error', {
      error: 'WebSocket connection error'
    });
  }

  private sendPing(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const pingMessage = {
        id: Date.now(),
        type: 'ping'
      };
      this.websocket.send(JSON.stringify(pingMessage));
    }
  }

  private subscribeToOrderUpdates(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        id: Date.now(),
        type: 'subscribe',
        topic: '/spotMarket/tradeOrders',
        privateChannel: true,
        response: true
      };
      
      this.websocket.send(JSON.stringify(subscribeMessage));
      loggingService.logEvent('TRADE', 'Subscribed to order updates via WebSocket');
    }
  }

  subscribeToOrder(orderId: string): void {
    this.subscribedOrderIds.add(orderId);
    loggingService.logEvent('TRADE', `Monitoring order ${orderId} via WebSocket`);
  }

  unsubscribeFromOrder(orderId: string): void {
    this.subscribedOrderIds.delete(orderId);
    loggingService.logEvent('TRADE', `Stopped monitoring order ${orderId}`);
  }

  onOrderUpdate(callback: OrderUpdateCallback): void {
    this.orderUpdateCallbacks.push(callback);
  }

  removeOrderUpdateCallback(callback: OrderUpdateCallback): void {
    const index = this.orderUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.orderUpdateCallbacks.splice(index, 1);
    }
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.orderUpdateCallbacks = [];
    this.subscribedOrderIds.clear();
    loggingService.logEvent('TRADE', 'KuCoin WebSocket disconnected');
  }

  isConnected(): boolean {
    return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
  }
}

export const kucoinWebsocketService = new KuCoinWebsocketService();
