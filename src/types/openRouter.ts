
// OpenRouter API type definitions

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  response_format?: { type: 'json_object' };
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: OpenRouterUsage;
}

export class OpenRouterError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'OpenRouterError';
  }
}
