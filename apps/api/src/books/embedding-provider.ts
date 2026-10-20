import OpenAI from 'openai';
import { getAiProviderConfiguration } from './ai-provider.config.js';

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

const maxBatchItems = 64;
const maxBatchBytes = 100_000;

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

    const byteLengths = texts.map((text, index) => {
      const size = Buffer.byteLength(text, 'utf8');
      if (size > maxBatchBytes) {
        throw new Error(
          `O trecho ${index} excede o limite de ${maxBatchBytes} bytes para embeddings.`,
        );
      }
      return size;
    });

    const vectors: number[][] = [];
    for (let start = 0; start < texts.length;) {
      let end = start;
      let batchBytes = 0;
      while (
        end < texts.length &&
        end - start < maxBatchItems &&
        batchBytes + byteLengths[end] <= maxBatchBytes
      ) {
        batchBytes += byteLengths[end];
        end += 1;
      }

      const batch = texts.slice(start, end);
      const response = await this.getClient().embeddings.create({
        model: this.model,
        input: batch,
        dimensions: this.dimensions,
        encoding_format: 'float',
      });
      const ordered = [...response.data].sort(
        (left, right) => left.index - right.index,
      );
      if (
        ordered.length !== batch.length ||
        ordered.some((item, index) => item.index !== index)
      ) {
        throw new Error(
          `A resposta de embeddings contém índices inválidos no lote iniciado no trecho ${start}.`,
        );
      }

      vectors.push(...ordered.map((item) => item.embedding));
      start = end;
    }

    return vectors;
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
