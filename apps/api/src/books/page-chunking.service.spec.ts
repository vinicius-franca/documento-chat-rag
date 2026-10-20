import { PageChunkingService } from './page-chunking.service.js';

describe('PageChunkingService', () => {
  it('cria chunks com overlap e preserva a faixa quando atravessa páginas', () => {
    const chunks = new PageChunkingService().segment(
      'book-123',
      [
        { pageNumber: 3, text: 'um dois três quatro' },
        { pageNumber: 4, text: 'cinco seis sete oito' },
      ],
      { chunkSizeTokens: 6, chunkOverlapTokens: 2 },
    );

    expect(chunks).toEqual([
      {
        bookId: 'book-123',
        text: 'um dois três quatro cinco seis',
        pageStart: 3,
        pageEnd: 4,
      },
      {
        bookId: 'book-123',
        text: 'cinco seis sete oito',
        pageStart: 4,
        pageEnd: 4,
      },
    ]);
  });

  it('não cria chunks para páginas sem texto', () => {
    const chunks = new PageChunkingService().segment('book-123', [{ pageNumber: 1, text: '   ' }]);

    expect(chunks).toEqual([]);
  });
});
