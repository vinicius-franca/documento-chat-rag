import { BadRequestException, Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import { getMaxUploadSizeBytes } from './upload-config.js';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UploadValidationService {
  validate(file: UploadedFile | undefined): UploadedFile {
    if (!file) {
      throw new BadRequestException('Envie um arquivo PDF.');
    }

    if (extname(file.originalname).toLowerCase() !== '.pdf') {
      throw new BadRequestException('A extensão do arquivo deve ser .pdf.');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('O tipo MIME do arquivo deve ser application/pdf.');
    }

    if (file.size > getMaxUploadSizeBytes()) {
      throw new BadRequestException('O arquivo excede o limite configurado.');
    }

    return file;
  }
}
