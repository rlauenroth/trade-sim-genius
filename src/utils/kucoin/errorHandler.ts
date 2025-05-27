
import { 
  ApiError, 
  TimestampError, 
  SignatureError, 
  IPWhitelistError, 
  MissingHeaderError 
} from '../errors';

// Enhanced error parsing for KuCoin responses
export async function parseKuCoinError(response: Response, requestPath: string, payload?: string): Promise<never> {
  let kucoinData: any = null;
  
  try {
    kucoinData = await response.json();
  } catch {
    // Failed to parse JSON, use generic error
  }

  const errorCode = kucoinData?.code;
  const localTime = Date.now();
  
  // Map specific KuCoin error codes
  switch (errorCode) {
    case '400001':
      throw new MissingHeaderError(response, kucoinData);
    case '400002':
      // Try to get server time for drift calculation
      const serverTimeHeader = response.headers.get('KC-API-TIME');
      const serverTime = serverTimeHeader ? parseInt(serverTimeHeader) : null;
      throw new TimestampError(response, kucoinData, localTime, serverTime || undefined);
    case '400005':
      throw new SignatureError(response, kucoinData, payload);
    case '400006':
      throw new IPWhitelistError(response, kucoinData);
    default:
      throw new ApiError(response, kucoinData);
  }
}
