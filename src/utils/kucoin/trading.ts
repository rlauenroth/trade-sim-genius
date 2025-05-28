
import { kucoinFetch } from './core';
import { TradeOrder, OrderResponse } from '@/types/appState';
import { ApiError, RateLimitError, ProxyError } from '../errors';
import { loggingService } from '@/services/loggingService';

// Generate client order ID
function generateClientOid(): string {
  return 'kt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Place a new order
export async function placeOrder(order: TradeOrder): Promise<OrderResponse> {
  try {
    console.log('🔄 Placing order:', order);
    
    const payload = {
      clientOid: order.clientOid || generateClientOid(),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      size: order.size,
      ...(order.price && { price: order.price })
    };

    loggingService.logEvent('TRADING', `ORDER_PLACE ${order.side} ${order.symbol}`, {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      size: order.size,
      price: order.price
    });

    const result = await kucoinFetch('/api/v1/orders', 'POST', {}, payload);
    
    if (result.code === '200000' && result.data?.orderId) {
      const orderResponse: OrderResponse = {
        orderId: result.data.orderId,
        status: 'active',
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        size: order.size,
        price: order.price,
        createdAt: Date.now()
      };

      loggingService.logEvent('TRADING', `ORDER_CREATED ${orderResponse.orderId}`, {
        orderId: orderResponse.orderId,
        symbol: order.symbol,
        side: order.side
      });

      console.log('✅ Order placed successfully:', orderResponse);
      return orderResponse;
    }
    
    throw new ApiError(new Response(JSON.stringify(result), { status: 400 }));
  } catch (error) {
    console.error('❌ Order placement failed:', error);
    
    loggingService.logError('ORDER_PLACE_FAILED', {
      symbol: order.symbol,
      side: order.side,
      error: error instanceof Error ? error.message : 'unknown_error'
    });
    
    if (error instanceof RateLimitError || error instanceof ProxyError || error instanceof ApiError) {
      throw error;
    }
    
    throw new ProxyError('Failed to place order');
  }
}

// Get order status
export async function getOrderStatus(orderId: string): Promise<OrderResponse> {
  try {
    console.log(`🔍 Checking order status: ${orderId}`);
    
    const result = await kucoinFetch(`/api/v1/orders/${orderId}`);
    
    if (result.code === '200000' && result.data) {
      const order = result.data;
      
      const orderResponse: OrderResponse = {
        orderId: order.id,
        status: order.isActive ? 'active' : 
                order.cancelExist ? 'cancelled' : 
                'done',
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        size: order.size,
        price: order.price,
        dealFunds: order.dealFunds,
        dealSize: order.dealSize,
        createdAt: new Date(order.createdAt).getTime()
      };

      console.log(`📊 Order ${orderId} status: ${orderResponse.status}`);
      return orderResponse;
    }
    
    throw new ApiError(new Response(JSON.stringify(result), { status: 400 }));
  } catch (error) {
    console.error(`❌ Failed to get order status for ${orderId}:`, error);
    
    if (error instanceof RateLimitError || error instanceof ProxyError || error instanceof ApiError) {
      throw error;
    }
    
    throw new ProxyError(`Failed to get order status for ${orderId}`);
  }
}

// Cancel an order
export async function cancelOrder(orderId: string): Promise<boolean> {
  try {
    console.log(`🚫 Cancelling order: ${orderId}`);
    
    const result = await kucoinFetch(`/api/v1/orders/${orderId}`, 'DELETE');
    
    if (result.code === '200000') {
      loggingService.logEvent('TRADING', `ORDER_CANCELLED ${orderId}`, {
        orderId
      });
      
      console.log(`✅ Order ${orderId} cancelled successfully`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Failed to cancel order ${orderId}:`, error);
    
    loggingService.logError('ORDER_CANCEL_FAILED', {
      orderId,
      error: error instanceof Error ? error.message : 'unknown_error'
    });
    
    return false;
  }
}

// Get all orders (with pagination)
export async function getOrders(
  symbol?: string,
  status?: 'active' | 'done',
  startAt?: number,
  endAt?: number,
  pageSize: number = 50
): Promise<OrderResponse[]> {
  try {
    console.log('📋 Fetching orders...');
    
    const query: Record<string, string | number> = {
      pageSize
    };
    
    if (symbol) query.symbol = symbol;
    if (status) query.status = status;
    if (startAt) query.startAt = startAt;
    if (endAt) query.endAt = endAt;
    
    const result = await kucoinFetch('/api/v1/orders', 'GET', query);
    
    if (result.code === '200000' && result.data?.items) {
      const orders: OrderResponse[] = result.data.items.map((order: any) => ({
        orderId: order.id,
        status: order.isActive ? 'active' : 
                order.cancelExist ? 'cancelled' : 
                'done',
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        size: order.size,
        price: order.price,
        dealFunds: order.dealFunds,
        dealSize: order.dealSize,
        createdAt: new Date(order.createdAt).getTime()
      }));

      console.log(`📊 Retrieved ${orders.length} orders`);
      return orders;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error);
    
    if (error instanceof RateLimitError || error instanceof ProxyError || error instanceof ApiError) {
      throw error;
    }
    
    return [];
  }
}

// Place multiple orders (bulk trading)
export async function placeMultipleOrders(orders: TradeOrder[]): Promise<OrderResponse[]> {
  const results: OrderResponse[] = [];
  
  for (const order of orders) {
    try {
      const result = await placeOrder(order);
      results.push(result);
      
      // Small delay between orders to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to place order for ${order.symbol}:`, error);
      // Continue with other orders even if one fails
    }
  }
  
  return results;
}
