
export async function signKuCoinRequest(
  timestamp: string,
  method: string,
  requestPath: string,
  body: unknown,
  secret: string
): Promise<string> {
  // Include query string in path for signature calculation
  const what = timestamp + method.toUpperCase() + requestPath + (body ? JSON.stringify(body) : '');
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(what));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
