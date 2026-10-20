import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

@Injectable()
export class PdfTextExtractionWorker {
  async extract(filePath: string): Promise<ExtractedPdfPage[]> {
    const fileData = await readFile(filePath);
    const loadingTask = getDocument({ data: new Uint8Array(fileData) });
    const document = await loadingTask.promise;

    try {
      const pages: ExtractedPdfPage[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pages.push({ pageNumber, text });
      }

      return pages;
    } finally {
      await loadingTask.destroy();
    }
  }
}
