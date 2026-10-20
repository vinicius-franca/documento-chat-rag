import OpenAI from 'openai';
import { getAiProviderConfiguration } from './ai-provider.config.js';

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI | undefined;
  private readonly configuration = getAiProviderConfiguration();

  constructor(
    private readonly apiKey = this.configuration.apiKey,
    private readonly model = this.configuration.embeddingModel,
    private readonly dimensions = getEmbeddingDimensions(),
    private readonly baseURL = this.configuration.baseURL,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    const response = await this.getClient().embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
      encoding_format: 'float',
    });

    return response.data.sort((left, right) => left.index - right.index).map((item) => item.embedding);
  }

  private getClient(): OpenAI {
    if (!this.apiKey) {
      throw new Error('A chave do provedor de IA não está configurada.');
    }
    this.client ??= new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
    return this.client;
  }
}

function getEmbeddingDimensions(): number {
  const configuredDimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);
  return Number.isSafeInteger(configuredDimensions) && configuredDimensions > 0
    ? configuredDimensions
    : 1536;
}
