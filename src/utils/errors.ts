
export class RateLimitError extends Error {
  retryAfter: number;
  response: Response;

  constructor(response: Response) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.response = response;
    this.retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
  }
}

export class ProxyError extends Error {
  response?: Response;

  constructor(message: string, response?: Response) {
    super(message);
    this.name = 'ProxyError';
    this.response = response;
  }
}

export class ApiError extends Error {
  status: number;
  response: Response;
  code?: string;
  kucoinMessage?: string;

  constructor(response: Response, kucoinData?: any) {
    super(`API Error: ${response.status} ${response.statusText}`);
    this.name = 'ApiError';
    this.status = response.status;
    this.response = response;
    
    // Parse KuCoin error response
    if (kucoinData?.code) {
      this.code = kucoinData.code;
      this.kucoinMessage = kucoinData.msg;
      this.message = `KuCoin Error ${this.code}: ${this.kucoinMessage}`;
    }
  }
}

export class TimestampError extends ApiError {
  timeDrift: number;

  constructor(response: Response, kucoinData?: any, localTime?: number, serverTime?: number) {
    super(response, kucoinData);
    this.name = 'TimestampError';
    this.timeDrift = localTime && serverTime ? Math.abs(localTime - serverTime) : 0;
  }
}

export class SignatureError extends ApiError {
  payload?: string;

  constructor(response: Response, kucoinData?: any, payload?: string) {
    super(response, kucoinData);
    this.name = 'SignatureError';
    this.payload = payload;
  }
}

export class IPWhitelistError extends ApiError {
  constructor(response: Response, kucoinData?: any) {
    super(response, kucoinData);
    this.name = 'IPWhitelistError';
  }
}

export class MissingHeaderError extends ApiError {
  constructor(response: Response, kucoinData?: any) {
    super(response, kucoinData);
    this.name = 'MissingHeaderError';
  }
}
