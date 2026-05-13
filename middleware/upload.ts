import { Request, Response, NextFunction } from 'express';
import {
  fileStorageService,
  UploadResult,
  isValidImageType,
  isValidFileSize,
  OwnerRole,
} from '../services/fileStorage';
import { logger } from '../utils/logger';

export interface Base64FileData {
  data: string;
  filename: string;
  mimeType: string;
}

export interface RequestWithFiles extends Request {
  uploadedFiles?: UploadResult[];
  uploadedFile?: UploadResult;
}

const base64ToBuffer = (base64String: string): Buffer => {
  const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

const extractMimeTypeFromDataUrl = (dataUrl: string): string | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
};

const validateBase64FileData = (
  fileData: unknown
): fileData is Base64FileData => {
  if (!fileData || typeof fileData !== 'object') return false;
  const o = fileData as Record<string, unknown>;
  return (
    typeof o.data === 'string' &&
    typeof o.filename === 'string' &&
    typeof o.mimeType === 'string'
  );
};

function requireUploaderId(req: RequestWithFiles): string {
  const uid = (req as { user?: { id?: string } }).user?.id;
  if (!uid) {
    throw new Error('UPLOAD_REQUIRES_AUTH_CONTEXT');
  }
  return uid;
}

/**
 * Single base64 file → S3 `{ownerRole}/{id}/{avatar|portfolio}/…`
 */
export const uploadSingle = (
  fieldName: string = 'file',
  ownerRole: OwnerRole,
  assetKind: 'avatar' | 'portfolio' = 'avatar'
) => {
  return async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    try {
      const fileData = req.body[fieldName];
      if (!fileData) {
        return next();
      }

      let base64Data: string;
      let filename: string;
      let mimeType: string;

      if (typeof fileData === 'string') {
        base64Data = fileData;
        mimeType = extractMimeTypeFromDataUrl(fileData) || 'image/jpeg';
        filename = `upload_${Date.now()}.${mimeType.split('/')[1]}`;
      } else if (validateBase64FileData(fileData)) {
        base64Data = fileData.data;
        filename = fileData.filename;
        mimeType = fileData.mimeType;
      } else {
        return res.status(400).json({
          ok: false,
          error:
            'Invalid file data format. Expected base64 string or file object.',
        });
      }

      const fileBuffer = base64ToBuffer(base64Data);

      if (!isValidFileSize(fileBuffer.length)) {
        return res.status(400).json({
          ok: false,
          error: 'File size too large. Maximum size is 15MB.',
        });
      }

      if (!isValidImageType(mimeType)) {
        return res.status(400).json({
          ok: false,
          error:
            'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        });
      }

      const userId = requireUploaderId(req);
      const uploaded = await fileStorageService.uploadObject(
        fileBuffer,
        { ownerRole, userId, assetKind },
        mimeType,
        filename
      );
      req.uploadedFile = uploaded;

      logger.info('base64 uploaded to S3', {
        ownerRole,
        assetKind,
        storageKey: uploaded.storageKey,
      });

      next();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'UPLOAD_REQUIRES_AUTH_CONTEXT'
      ) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
      logger.error('Error in base64 upload middleware:', error);
      res.status(500).json({
        ok: false,
        error: `Failed to process base64 file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  };
};

export const uploadMultiple = (
  fieldName: string = 'files',
  maxFiles: number = 5,
  ownerRole: OwnerRole = 'barber'
) => {
  return async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    try {
      const filesData = req.body[fieldName];
      if (!filesData || !Array.isArray(filesData) || filesData.length === 0) {
        return next();
      }

      if (filesData.length > maxFiles) {
        return res.status(400).json({
          ok: false,
          error: `Too many files. Maximum allowed: ${maxFiles}`,
        });
      }

      const processedFiles: Array<{
        buffer: Buffer;
        originalName: string;
        mimeType: string;
      }> = [];

      for (let i = 0; i < filesData.length; i++) {
        const fileData = filesData[i];
        let base64Data: string;
        let filename: string;
        let mimeType: string;

        if (typeof fileData === 'string') {
          base64Data = fileData;
          mimeType = extractMimeTypeFromDataUrl(fileData) || 'image/jpeg';
          filename = `upload_${Date.now()}_${i}.${mimeType.split('/')[1]}`;
        } else if (validateBase64FileData(fileData)) {
          base64Data = fileData.data;
          filename = fileData.filename;
          mimeType = fileData.mimeType;
        } else {
          return res.status(400).json({
            ok: false,
            error: `Invalid file data format at index ${i}. Expected base64 string or file object.`,
          });
        }

        const fileBuffer = base64ToBuffer(base64Data);
        if (!isValidFileSize(fileBuffer.length)) {
          return res.status(400).json({
            ok: false,
            error: `File at index ${i} is too large. Maximum size is 15MB.`,
          });
        }
        if (!isValidImageType(mimeType)) {
          return res.status(400).json({
            ok: false,
            error: `Invalid file type at index ${i}. Only JPEG, PNG, GIF, and WebP are allowed.`,
          });
        }

        processedFiles.push({
          buffer: fileBuffer,
          originalName: filename,
          mimeType,
        });
      }

      const userId = requireUploaderId(req);
      req.uploadedFiles = await fileStorageService.uploadPortfolioBatch(
        processedFiles,
        ownerRole,
        userId
      );

      next();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'UPLOAD_REQUIRES_AUTH_CONTEXT'
      ) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
      logger.error('Error in base64 multiple upload:', error);
      res.status(500).json({
        ok: false,
        error: `Failed to process base64 files: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  };
};

export const uploadAvatar = (
  fieldName: string = 'avatar',
  ownerRole: OwnerRole
) => uploadSingle(fieldName, ownerRole, 'avatar');

export const uploadPortfolio = (
  fieldName: string = 'images',
  maxFiles: number = 10,
  ownerRole: OwnerRole = 'barber'
) => uploadMultiple(fieldName, maxFiles, ownerRole);

export const handleUploadError = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.message.includes('Invalid file type')) {
    res.status(400).json({
      ok: false,
      error: err.message,
    });
    return;
  }

  if (err.message.includes('Failed to compress')) {
    res.status(400).json({
      ok: false,
      error: 'Image processing failed. Please try with a different image.',
    });
    return;
  }

  if (err.message.includes('base64')) {
    res.status(400).json({
      ok: false,
      error: 'Invalid base64 data format.',
    });
    return;
  }

  next(err);
};
