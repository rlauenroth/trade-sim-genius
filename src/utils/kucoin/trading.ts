
import { TradeOrder, OrderResponse } from '@/types/appState';
import { kucoinFetch } from './core';

interface KuCoinCredentials {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
}

export const createOrder = async (
  credentials: KuCoinCredentials,
  order: TradeOrder
): Promise<OrderResponse | null> => {
  try {
    const orderData = {
      clientOid: order.clientOid || `order_${Date.now()}`,
      side: order.side,
      symbol: order.symbol,
      type: order.type,
      size: order.size,
      ...(order.price && { price: order.price })
    };

    console.log('Creating KuCoin order:', orderData);

    const response = await kucoinFetch('/api/v1/orders', 'POST', {}, orderData);

    if (response?.data?.orderId) {
      return {
        orderId: response.data.orderId,
        status: 'active',
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        size: order.size,
        price: order.price,
        createdAt: Date.now()
      };
    }

    return null;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getOrderStatus = async (
  credentials: KuCoinCredentials,
  orderId: string
): Promise<OrderResponse | null> => {
  try {
    console.log('Fetching order status for:', orderId);

    const response = await kucoinFetch(`/api/v1/orders/${orderId}`, 'GET');

    if (response?.data) {
      const orderData = response.data;
      return {
        orderId: orderData.id,
        status: orderData.isActive ? 'active' : 'done',
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        size: orderData.size,
        price: orderData.price,
        dealFunds: orderData.dealFunds,
        dealSize: orderData.dealSize,
        createdAt: new Date(orderData.createdAt).getTime()
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
};

export const getAllOrders = async (
  credentials: KuCoinCredentials,
  status: 'active' | 'done' = 'active'
): Promise<OrderResponse[]> => {
  try {
    console.log('Fetching all orders with status:', status);

    const response = await kucoinFetch('/api/v1/orders', 'GET', { status });

    if (response?.data?.items) {
      return response.data.items.map((order: any) => ({
        orderId: order.id,
        status: order.isActive ? 'active' : 'done',
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        size: order.size,
        price: order.price,
        dealFunds: order.dealFunds,
        dealSize: order.dealSize,
        createdAt: new Date(order.createdAt).getTime()
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const cancelOrder = async (
  credentials: KuCoinCredentials,
  orderId: string
): Promise<boolean> => {
  try {
    console.log('Canceling order:', orderId);

    const response = await kucoinFetch(`/api/v1/orders/${orderId}`, 'DELETE');

    return response?.data?.cancelledOrderIds?.includes(orderId) || false;
  } catch (error) {
    console.error('Error canceling order:', error);
    throw error;
  }
};
