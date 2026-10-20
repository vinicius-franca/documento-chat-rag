import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { UploadedFile } from './upload-validation.service.js';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface StoredFile {
  relativePath: string;
}

export interface BookFileStore {
  getAbsolutePath(relativePath: string): string;
}

@Injectable()
export class FileStorageService {
  private readonly uploadDirectory = resolve(
    fileURLToPath(new URL('../../../../storage/uploads', import.meta.url)),
  );

  async store(file: UploadedFile): Promise<StoredFile> {
    await mkdir(this.uploadDirectory, { recursive: true });

    const fileName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    await writeFile(resolve(this.uploadDirectory, fileName), file.buffer, { flag: 'wx' });

    return { relativePath: `storage/uploads/${fileName}` };
  }

  getAbsolutePath(relativePath: string): string {
    return resolve(fileURLToPath(new URL('../../../../', import.meta.url)), relativePath);
  }
}
