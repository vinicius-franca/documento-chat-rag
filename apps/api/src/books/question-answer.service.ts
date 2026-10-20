import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY, type BookRepository } from './book-repository.js';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.js';
import { GENERATION_PROVIDER, type GenerationProvider } from './generation-provider.js';
import { BookVectorSearchService } from './book-vector-search.service.js';
import type { VectorSearchResult } from './qdrant-chunk-store.js';

export interface AskQuestionInput {
  question: string;
  bookIds?: string[];
}

export interface AnswerSource {
  chunkId: string;
  bookId: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  excerpt: string;
}

export interface GroundedAnswer {
  answer: string;
  insufficientContext: boolean;
  sources: AnswerSource[];
}

export const insufficientContextAnswer =
  'Não encontrei evidência suficiente nos livros selecionados. Selecione ou envie outro livro.';

@Injectable()
export class QuestionAnswerService {
  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    private readonly vectorSearch: BookVectorSearchService,
    @Inject(GENERATION_PROVIDER) private readonly generation: GenerationProvider,
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
  ) {}

  async answer(input: AskQuestionInput): Promise<GroundedAnswer> {
    const question = input.question.trim();
    if (!question) {
      throw new BadRequestException('A pergunta deve ser preenchida.');
    }

    const [questionVector] = await this.embeddings.embed([question]);
    if (!questionVector) {
      throw new Error('Não foi possível gerar o embedding da pergunta.');
    }
    const chunks = await this.vectorSearch.search(questionVector, input.bookIds);
    if (chunks.length === 0) {
      return insufficientContextResponse();
    }
    const generated = await this.generation.generate({
      question,
      context: contextFrom(chunks),
    });

    if (generated.insufficientContext) {
      return insufficientContextResponse();
    }

    const sources = await this.resolveSources(generated.sourceChunkIds, chunks);
    if (sources.length === 0) {
      return insufficientContextResponse();
    }

    return {
      answer: generated.answer,
      insufficientContext: false,
      sources,
    };
  }

  private async resolveSources(sourceChunkIds: string[], chunks: VectorSearchResult[]): Promise<AnswerSource[]> {
    const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    const sources: AnswerSource[] = [];

    for (const chunkId of sourceChunkIds) {
      const chunk = chunksById.get(chunkId);
      if (!chunk) {
        continue;
      }
      const book = await this.books.findById(chunk.bookId);
      if (!book) {
        continue;
      }

      sources.push({
        chunkId: chunk.id,
        bookId: book.id,
        title: book.title,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        excerpt: chunk.text,
      });
    }

    return sources;
  }
}

function insufficientContextResponse(): GroundedAnswer {
  return { answer: insufficientContextAnswer, insufficientContext: true, sources: [] };
}

function contextFrom(chunks: VectorSearchResult[]): string {
  return chunks
    .map(
      (chunk) =>
        `[chunkId: ${chunk.id}; bookId: ${chunk.bookId}; páginas: ${chunk.pageStart}-${chunk.pageEnd}]\n${chunk.text}`,
    )
    .join('\n\n');
}
