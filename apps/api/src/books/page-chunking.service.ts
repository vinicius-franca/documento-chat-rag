import { Injectable } from '@nestjs/common';
import { getChunkingConfiguration, type ChunkingConfiguration } from './chunking-config.js';
import type { ExtractedPdfPage } from './pdf-text-extraction.worker.js';

export interface IndexableChunk {
  bookId: string;
  text: string;
  pageStart: number;
  pageEnd: number;
}

interface PageToken {
  pageNumber: number;
  value: string;
}

@Injectable()
export class PageChunkingService {
  segment(
    bookId: string,
    pages: ExtractedPdfPage[],
    configuration: ChunkingConfiguration = getChunkingConfiguration(),
  ): IndexableChunk[] {
    const tokens = pages.flatMap((page) => this.tokensFromPage(page));
    const chunks: IndexableChunk[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + configuration.chunkSizeTokens, tokens.length);
      const chunkTokens = tokens.slice(start, end);

      chunks.push({
        bookId,
        text: chunkTokens.map((token) => token.value).join(' '),
        pageStart: chunkTokens[0].pageNumber,
        pageEnd: chunkTokens.at(-1)?.pageNumber ?? chunkTokens[0].pageNumber,
      });

      if (end === tokens.length) {
        break;
      }

      start = Math.max(start + 1, end - configuration.chunkOverlapTokens);
    }

    return chunks;
  }

  private tokensFromPage(page: ExtractedPdfPage): PageToken[] {
    return page.text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((value) => ({ pageNumber: page.pageNumber, value }));
  }
}
