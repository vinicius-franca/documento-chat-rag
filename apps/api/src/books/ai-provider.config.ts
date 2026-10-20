export type AiProviderName = 'openai' | 'openrouter';

export interface AiProviderConfiguration {
  name: AiProviderName;
  apiKey: string;
  baseURL?: string;
  embeddingModel: string;
  generationModel: string;
}

export function getAiProviderConfiguration(): AiProviderConfiguration {
  const name = getProviderName();

  if (name === 'openai') {
    return {
      name,
      apiKey: process.env.OPENAI_API_KEY ?? '',
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
      generationModel: process.env.OPENAI_GENERATION_MODEL ?? 'gpt-4.1-mini',
    };
  }

  return {
    name,
    apiKey: process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
    baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    embeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small',
    generationModel: process.env.OPENROUTER_GENERATION_MODEL ?? 'openai/gpt-4.1-mini',
  };
}

function getProviderName(): AiProviderName {
  const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase() ?? 'openrouter';

  if (configuredProvider === 'openai' || configuredProvider === 'openrouter') {
    return configuredProvider;
  }

  throw new Error('AI_PROVIDER deve ser "openai" ou "openrouter".');
}
