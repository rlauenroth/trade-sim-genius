
import { ApiError } from '../errors';
import { kucoinFetch } from './core';
import { ActivityLogger } from './types';

// Global activity logger access
let globalActivityLogger: ActivityLogger | null = null;

export function setAccountDataActivityLogger(logger: ActivityLogger | null) {
  globalActivityLogger = logger;
}

export async function getAccountBalances() {
  const response = await kucoinFetch('/api/v1/accounts');
  
  if (response.code === '200000' && Array.isArray(response.data)) {
    const balances = response.data.map((account: any) => ({
      currency: account.currency,
      balance: account.balance,
      available: account.available,
      holds: account.holds
    }));
    
    const nonZeroBalances = balances.filter(b => parseFloat(b.balance) > 0);
    globalActivityLogger?.addKucoinSuccessLog('/api/v1/accounts', `${nonZeroBalances.length} Kontosalden geladen`);
    return balances;
  }
  
  throw new ApiError(new Response(JSON.stringify(response), { status: 400 }));
}
