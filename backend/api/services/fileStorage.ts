import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config, AWS_S3_SIGNED_URL_TTL_SECONDS } from '../config/config';
import { logger } from '../utils/logger';

export type OwnerRole = 'barber' | 'client';

export type MediaAssetKind = 'avatar' | 'portfolio';

export interface UploadSubject {
  ownerRole: OwnerRole;
  userId: string;
  assetKind: MediaAssetKind;
}

/** Result of an upload — full immutable S3 object key stored in Firestore */
export interface UploadResult {
  storageKey: string;
}

function logicalPathForUpload(
  subject: UploadSubject,
  originalName: string
): string {
  const ext = path.extname(originalName);
  const base = uuidv4() + (ext || '.jpg');
  const segment = subject.ownerRole === 'barber' ? 'barbers' : 'clients';
  return `${segment}/${subject.userId}/${subject.assetKind}/${base}`;
}

export function normalizeFullObjectKey(candidate: string): string {
  return candidate.trim().replace(/^\/+/, '');
}

export function fullObjectKey(logicalRelative: string): string {
  const logical = logicalRelative.replace(/^\/+/, '');
  return `${config.awsS3KeyPrefixNormalized}${logical}`;
}

/** Parse Firebase / GCS public URL — returns bucket and object path */
export function parseGcsPublicUrl(url: string): {
  bucket: string;
  objectKey: string;
} | null {
  try {
    if (!url.includes('storage.googleapis.com')) {
      return null;
    }
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    const bucket = decodeURIComponent(parts[0]);
    const objectKey = parts.slice(1).map(decodeURIComponent).join('/');
    return { bucket, objectKey };
  } catch (error) {
    logger.warn('Could not parse GCS URL:', { url, error });
    return null;
  }
}

function looksLikeHttpsRef(ref: string): boolean {
  return ref.startsWith('http://') || ref.startsWith('https://');
}

function createS3Client(): S3Client {
  return new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
}

export class FileStorageService {
  private static instance: FileStorageService;
  private readonly s3: S3Client;

  private constructor() {
    this.s3 = createS3Client();
  }

  public static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  public buildLogicalPath(
    subject: UploadSubject,
    originalFilename: string
  ): string {
    return logicalPathForUpload(subject, originalFilename);
  }

  public async uploadObject(
    fileBuffer: Buffer,
    subject: UploadSubject,
    mimeType: string,
    originalName: string
  ): Promise<UploadResult> {
    const logical = this.buildLogicalPath(subject, originalName);
    const key = fullObjectKey(logical);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: config.awsS3Bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
          ServerSideEncryption: 'AES256',
        })
      );

      logger.info('File uploaded to S3:', { storageKey: key });
      return { storageKey: key };
    } catch (error) {
      logger.error('Error uploading object to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  public async uploadPortfolioBatch(
    files: Array<{
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    }>,
    ownerRole: OwnerRole,
    userId: string
  ): Promise<UploadResult[]> {
    const tasks = files.map(f =>
      this.uploadObject(
        f.buffer,
        { ownerRole, userId, assetKind: 'portfolio' },
        f.mimeType,
        f.originalName
      )
    );
    return Promise.all(tasks);
  }

  public async deleteObject(key: string): Promise<void> {
    const normalizedKey = normalizeFullObjectKey(key);
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: config.awsS3Bucket,
          Key: normalizedKey,
        })
      );
      logger.info('S3 object deleted:', { storageKey: normalizedKey });
    } catch (error) {
      logger.error('Error deleting S3 object:', {
        key: normalizedKey,
        error,
      });
      throw new Error('Failed to delete file from S3');
    }
  }

  public async deleteStoredReference(reference: string): Promise<void> {
    if (!reference) return;
    if (looksLikeHttpsRef(reference)) {
      // Legacy GCS URL from before S3 migration — no longer deletable via SDK.
      logger.warn(
        'Skipping delete of legacy GCS URL (storage migrated to S3)',
        { reference }
      );
      return;
    }
    await this.deleteObject(reference);
  }

  public async getSignedUrlForKey(
    fullKey: string,
    expiresSeconds: number = AWS_S3_SIGNED_URL_TTL_SECONDS
  ): Promise<string> {
    const key = normalizeFullObjectKey(fullKey);
    try {
      const cmd = new GetObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3 as never, cmd as never, {
        expiresIn: expiresSeconds,
      });
    } catch (error) {
      logger.error('Error generating S3 signed URL:', { key, error });
      throw new Error('Failed to generate signed URL');
    }
  }

  public async objectExists(ref: string): Promise<boolean> {
    const raw = ref.trim();
    if (!raw) return false;
    if (looksLikeHttpsRef(raw)) {
      try {
        const res = await fetch(raw, { method: 'HEAD' });
        return res.ok;
      } catch {
        return false;
      }
    }

    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: config.awsS3Bucket,
          Key: normalizeFullObjectKey(raw),
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const fileStorageService = FileStorageService.getInstance();

export const isValidImageType = (mimeType: string): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  return allowedTypes.includes(mimeType.toLowerCase());
};

export const isValidFileSize = (
  size: number,
  maxSizeMB: number = 15
): boolean => size <= maxSizeMB * 1024 * 1024;

/** Resolve persisted ref to HTTPS — signed GET for keys, HTTPS passthrough for legacy */
export async function resolveMediaRefForApi(
  ref: string | null | undefined
): Promise<string | undefined> {
  if (!ref) return undefined;
  if (looksLikeHttpsRef(ref)) {
    return ref;
  }
  return fileStorageService.getSignedUrlForKey(ref);
}

export async function resolveManyMediaRefsForApi(
  refs?: string[]
): Promise<string[]> {
  if (!refs?.length) return [];
  const list = await Promise.all(refs.map(r => resolveMediaRefForApi(r)));
  return list.filter((x): x is string => !!x);
}

export async function validateStoredAvatarRef(ref: string): Promise<boolean> {
  if (!ref) return false;
  return fileStorageService.objectExists(ref);
}

/** @deprecated */
export function extractFilePathFromUrl(url: string): string | null {
  const pg = parseGcsPublicUrl(url);
  return pg ? pg.objectKey : null;
}

/** @deprecated */
export async function validateFirebaseStorageUrl(
  url: string
): Promise<boolean> {
  return validateStoredAvatarRef(url);
}
