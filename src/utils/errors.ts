
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

  constructor(response: Response) {
    super(`API Error: ${response.status} ${response.statusText}`);
    this.name = 'ApiError';
    this.status = response.status;
    this.response = response;
  }
}
