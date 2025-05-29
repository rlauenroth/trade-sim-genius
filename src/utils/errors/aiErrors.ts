
export class AITimeoutError extends Error {
  readonly timeout: number;
  readonly requestType: 'screening' | 'detail' | 'exit';
  readonly assetPair?: string;

  constructor(timeout: number, requestType: 'screening' | 'detail' | 'exit', assetPair?: string) {
    super(`AI request timeout after ${timeout}ms`);
    this.name = 'AITimeoutError';
    this.timeout = timeout;
    this.requestType = requestType;
    this.assetPair = assetPair;
  }
}

export class AIParsingError extends Error {
  readonly rawResponse: string;
  readonly parseStage: 'json' | 'validation' | 'extraction';
  readonly assetPair?: string;

  constructor(message: string, rawResponse: string, parseStage: 'json' | 'validation' | 'extraction', assetPair?: string) {
    super(message);
    this.name = 'AIParsingError';
    this.rawResponse = rawResponse;
    this.parseStage = parseStage;
    this.assetPair = assetPair;
  }
}

export class AIHallucinationError extends Error {
  readonly detectedSymbol: string;
  readonly expectedSymbols: string[];

  constructor(detectedSymbol: string, expectedSymbols: string[]) {
    super(`AI hallucination detected: ${detectedSymbol} not in expected symbols`);
    this.name = 'AIHallucinationError';
    this.detectedSymbol = detectedSymbol;
    this.expectedSymbols = expectedSymbols;
  }
}

export class AIModelError extends Error {
  readonly model: string;
  readonly errorType: 'auth' | 'rate_limit' | 'server' | 'unknown';
  readonly statusCode?: number;

  constructor(message: string, model: string, errorType: 'auth' | 'rate_limit' | 'server' | 'unknown', statusCode?: number) {
    super(message);
    this.name = 'AIModelError';
    this.model = model;
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}
