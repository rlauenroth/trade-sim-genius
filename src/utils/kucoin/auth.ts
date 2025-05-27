
import { signKuCoinRequest } from '../kucoinSigner';

// Encrypt passphrase using HMAC-SHA256 with secret (KuCoin API v2 requirement)
export async function encryptPassphrase(passphrase: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(passphrase));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createAuthHeaders(
  keys: { apiKey: string; secret: string; passphrase: string },
  method: string,
  signaturePath: string,
  body?: unknown
) {
  const timestamp = Date.now().toString();
  const signature = await signKuCoinRequest(timestamp, method, signaturePath, body, keys.secret);
  const encryptedPassphrase = await encryptPassphrase(keys.passphrase, keys.secret);

  return {
    'KC-API-KEY': keys.apiKey,
    'KC-API-SIGN': signature,
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': encryptedPassphrase,
    'KC-API-KEY-VERSION': '2',
    'Content-Type': 'application/json',
  };
}
