import { fileURLToPath } from 'node:url';
import { PdfTextExtractionWorker } from './pdf-text-extraction.worker.js';

describe('PdfTextExtractionWorker', () => {
  it('preserva o texto e o número de cada página do corpus autorizado', async () => {
    const fixturePath = fileURLToPath(
      new URL('../../../../test/fixtures/corpus/caderno-rag-experimental.pdf', import.meta.url),
    );
    const worker = new PdfTextExtractionWorker();

    const pages = await worker.extract(fixturePath);

    expect(pages).toHaveLength(12);
    expect(pages[0]).toMatchObject({
      pageNumber: 1,
      text: expect.stringContaining('Caderno RAG Experimental'),
    });
    expect(pages[4]).toMatchObject({
      pageNumber: 5,
      text: expect.stringContaining('600 tokens'),
    });
  });
});
