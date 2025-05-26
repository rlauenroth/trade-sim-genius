
export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  priceHint: string;
  description: string;
}

export const modelOptions: ModelOption[] = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    priceHint: '$15/1M tokens',
    description: 'Leistungsstarkes Modell für komplexe Analysen'
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    priceHint: '$0.60/1M tokens',
    description: 'Schnelles und kostengünstiges Modell'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    priceHint: '$15/1M tokens',
    description: 'Ausgewogenes Modell für Trading-Analysen'
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    priceHint: '$1.25/1M tokens',
    description: 'Schnelle Antworten für einfache Analysen'
  },
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5',
    provider: 'Google',
    priceHint: '$0.75/1M tokens',
    description: 'Optimiert für schnelle Marktanalysen'
  }
];

export const getModelByTitle = (title: string): ModelOption | undefined => {
  return modelOptions.find(model => model.id === title);
};
