import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export type BookStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

export interface LibraryBook {
  id: string;
  title: string;
  pageCount: number | null;
  createdAt: string;
  status: BookStatus;
  processingError: string | null;
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

@Injectable({ providedIn: 'root' })
export class BookApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  listBooks() {
    return this.http.get<LibraryBook[]>(`${this.baseUrl}/books`);
  }

  upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<LibraryBook>(`${this.baseUrl}/books/upload`, body);
  }

  ask(question: string, bookIds: string[]) {
    return this.http.post<GroundedAnswer>(`${this.baseUrl}/questions`, { question, bookIds });
  }
}
