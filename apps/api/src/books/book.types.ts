export const bookProcessingStatuses = ['uploaded', 'processing', 'ready', 'failed'] as const;

export type BookProcessingStatus = (typeof bookProcessingStatuses)[number];

export interface Book {
  id: string;
  title: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  status: BookProcessingStatus;
  processingError: string | null;
  indexingJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookInput {
  title: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}
