import OpenAI from 'openai';
import { getAiProviderConfiguration } from './ai-provider.config.js';

export const GENERATION_PROVIDER = Symbol('GENERATION_PROVIDER');

export interface GroundedGenerationRequest {
  question: string;
  context: string;
}

export interface GroundedGeneration {
  answer: string;
  sourceChunkIds: string[];
  insufficientContext: boolean;
}

export interface GenerationProvider {
  generate(input: GroundedGenerationRequest): Promise<GroundedGeneration>;
}

export class OpenAiGenerationProvider implements GenerationProvider {
  private client: OpenAI | undefined;
  private readonly configuration = getAiProviderConfiguration();

  constructor(
    private readonly apiKey = this.configuration.apiKey,
    private readonly model = this.configuration.generationModel,
    private readonly baseURL = this.configuration.baseURL,
  ) {}

  async generate(input: GroundedGenerationRequest): Promise<GroundedGeneration> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'Responda somente com base no contexto fornecido. Retorne JSON seguindo o schema. Se o contexto não for suficiente, marque insufficientContext como true e não informe sourceChunkIds.',
        },
        {
          role: 'user',
          content: `Pergunta: ${input.question}\n\nContexto:\n${input.context}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'grounded_book_answer',
          strict: true,
          schema: groundedGenerationSchema,
        },
      },
    });

    return validateGroundedGeneration(response.choices[0]?.message.content);
  }

  private getClient(): OpenAI {
    if (!this.apiKey) {
      throw new Error('A chave do provedor de IA não está configurada.');
    }
    this.client ??= new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
    return this.client;
  }
}

export function validateGroundedGeneration(value: unknown): GroundedGeneration {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  if (!isRecord(parsed)) {
    throw new Error('A geração não retornou um objeto JSON.');
  }
  if (typeof parsed.answer !== 'string') {
    throw new Error('A geração deve incluir answer como texto.');
  }
  if (!Array.isArray(parsed.sourceChunkIds) || !parsed.sourceChunkIds.every(isNonEmptyString)) {
    throw new Error('A geração deve incluir sourceChunkIds como lista de textos.');
  }
  if (typeof parsed.insufficientContext !== 'boolean') {
    throw new Error('A geração deve incluir insufficientContext como booleano.');
  }

  return {
    answer: parsed.answer,
    sourceChunkIds: parsed.sourceChunkIds,
    insufficientContext: parsed.insufficientContext,
  };
}

const groundedGenerationSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    sourceChunkIds: { type: 'array', items: { type: 'string' } },
    insufficientContext: { type: 'boolean' },
  },
  required: ['answer', 'sourceChunkIds', 'insufficientContext'],
  additionalProperties: false,
};

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('A geração não retornou JSON válido.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
