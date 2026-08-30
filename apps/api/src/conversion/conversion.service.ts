import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { isSupportedConversion } from '@/common/domain/conversion-pair';
import type { FileFormat } from '@/common/domain/file-format';
import { ApiException } from '@/common/errors/api-exception';
import { convertWithLibreOffice } from './libreoffice-adapter';

export type ConvertInput = {
  bytes: Uint8Array;
  sourceFormat: FileFormat;
  targetFormat: FileFormat;
};

const JPEG_QUALITY = 90;
const WHITE_BACKGROUND = { r: 255, g: 255, b: 255 };

const decodeImage = (bytes: Uint8Array) => sharp(bytes, { failOn: 'error' });

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  async convert(input: ConvertInput): Promise<Uint8Array> {
    if (!isSupportedConversion(input.sourceFormat, input.targetFormat)) {
      throw new ApiException('unsupported_conversion');
    }

    if (input.sourceFormat === 'jpg' && input.targetFormat === 'png') {
      return convertJpgToPng(input.bytes);
    }

    if (input.sourceFormat === 'png' && input.targetFormat === 'jpg') {
      return convertPngToJpg(input.bytes);
    }

    if (
      (input.sourceFormat === 'docx' && input.targetFormat === 'pdf') ||
      (input.sourceFormat === 'pdf' && input.targetFormat === 'docx')
    ) {
      return convertWithLibreOffice(
        input.bytes,
        input.sourceFormat,
        input.targetFormat,
        this.logger,
      );
    }

    throw new ApiException('unsupported_conversion');
  }
}

const convertJpgToPng = async (bytes: Uint8Array): Promise<Uint8Array> => {
  try {
    return await decodeImage(bytes).png().toBuffer();
  } catch (error: unknown) {
    throw new ApiException('conversion_failed', undefined, error);
  }
};

const convertPngToJpg = async (bytes: Uint8Array): Promise<Uint8Array> => {
  try {
    return await decodeImage(bytes)
      .flatten({ background: WHITE_BACKGROUND })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch (error: unknown) {
    throw new ApiException('conversion_failed', undefined, error);
  }
};
