import dotenv from 'dotenv';

// Load environment-specific variables
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

// Try to load environment-specific file first, fallback to .env
try {
  dotenv.config({ path: envFile });
} catch (error) {
  // Fallback to default .env file
  dotenv.config();
}

/** Normalize AWS_S3_PREFIX: trims slashes, guarantees trailing slash unless empty */
export function normalizeAwsS3KeyPrefix(prefix: string | undefined): string {
  if (!prefix?.trim()) {
    return '';
  }
  const trimmed = prefix.trim().replace(/^\/+/g, '');
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * When AWS_S3_PREFIX is not provided, use NODE_ENV as the folder name (normalized).
 *
 * Omit AWS_S3_PREFIX if your bucket shards match `NODE_ENV` per deploy (configure
 * NODE_ENV accordingly on hosting if you rely on inferred prefixes).
 */
function inferAwsS3PrefixFromEnvironment(nodeEnv: string): string {
  return normalizeAwsS3KeyPrefix(nodeEnv);
}

function resolveAwsS3KeyPrefix(nodeEnv: string): string {
  if (Object.prototype.hasOwnProperty.call(process.env, 'AWS_S3_PREFIX')) {
    return normalizeAwsS3KeyPrefix(process.env.AWS_S3_PREFIX);
  }
  return inferAwsS3PrefixFromEnvironment(nodeEnv);
}

export interface Config {
  port: number;
  nodeEnv: string;
  firebaseProjectId: string;
  firebasePrivateKey?: string;
  firebaseClientEmail?: string;
  jwtSecret: string;
  /** Legacy base URL helper; superseded by S3 signed URLs for new uploads */
  fileUrl: string;
  expoAccessToken?: string;
  corsOrigin: string;
  rateLimitMax: number;
  /** When set, rate limiting uses Redis so limits apply across all serverless instances (e.g. Vercel). */
  redisUrl?: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  /** e.g. development/, staging/, production/ — prepended to every logical object key */
  awsS3KeyPrefixNormalized: string;
  /**
   * Firebase Auth UIDs (comma-separated) allowed to call /admin with a valid app JWT
   * when Firebase ID token verification is not used. See `middleware/adminAuth.ts`.
   */
  adminUidAllowlist: string[];
  /**
   * Optional shared secret for scripts (--header X-Admin-Api-Key). Not for end users.
   */
  adminApiKey?: string;
}

/** Presigned GET lifetime for private S3 objects (seconds); not overridden by env */
export const AWS_S3_SIGNED_URL_TTL_SECONDS = 3600;
function validateConfig(): Config {
  const requiredEnvVars = [
    'JWT_SECRET',
    'FIREBASE_PROJECT_ID',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // S3 Express One Zone ("directory") buckets are named `<name>--<az-id>--x-s3`.
  // They sign presigned URLs against CreateSession credentials that AWS caps at
  // ~5 minutes, no matter what expiresIn is requested (AWS_S3_SIGNED_URL_TTL_SECONDS
  // above is ignored past that point) — every image URL this API hands out silently
  // starts 403ing well before its claimed 1h expiry. Directory buckets are built for
  // high-throughput/low-latency workloads, not public profile photos; use a standard
  // S3 bucket here.
  if (/--[a-z0-9-]+--x-s3$/.test(process.env.AWS_S3_BUCKET || '')) {
    throw new Error(
      `AWS_S3_BUCKET ("${process.env.AWS_S3_BUCKET}") looks like an S3 Express One Zone directory bucket. ` +
        'Presigned URLs on directory buckets expire in ~5 minutes regardless of the requested TTL, which breaks ' +
        'image loading app-wide once any caching or navigation delay passes that window. Use a standard S3 bucket.'
    );
  }

  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error(
      'Firebase configuration incomplete. Provide both FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL'
    );
  }

  const nodeEnv = process.env.NODE_ENV || 'development';

  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID!;

  const defaultRateLimit =
    nodeEnv === 'production' ? 100 : nodeEnv === 'staging' ? 200 : 1000;
  const defaultCorsOrigin =
    nodeEnv === 'production' ? 'https://yourapp.com' : '*';

  const awsS3Prefix = resolveAwsS3KeyPrefix(nodeEnv);

  const adminUidAllowlist = (process.env.ADMIN_UID_ALLOWLIST || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv,
    firebaseProjectId,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    jwtSecret: process.env.JWT_SECRET!,
    fileUrl:
      process.env.FILE_URL ||
      `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
    corsOrigin: process.env.CORS_ORIGIN || defaultCorsOrigin,
    rateLimitMax: parseInt(
      process.env.RATE_LIMIT_MAX || defaultRateLimit.toString(),
      10
    ),
    redisUrl: process.env.REDIS_URL?.trim() || undefined,
    awsRegion: process.env.AWS_REGION!,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    awsS3Bucket: process.env.AWS_S3_BUCKET!,
    awsS3KeyPrefixNormalized: awsS3Prefix,
    adminUidAllowlist,
    adminApiKey: process.env.ADMIN_API_KEY?.trim() || undefined,
  };
}

export const config = validateConfig();

// Log current environment configuration (without sensitive data)
console.log(`🚀 Starting server in ${config.nodeEnv} environment`);
console.log(`📦 Firebase Project: ${config.firebaseProjectId}`);
console.log(
  `🪣 S3 bucket/prefix: ${config.awsS3Bucket} / '${config.awsS3KeyPrefixNormalized}'`
);
console.log(`🔗 CORS Origin: ${config.corsOrigin}`);
const rateLimitBackend = config.redisUrl
  ? 'Redis (shared across instances)'
  : 'in-memory (per instance — weak on Vercel)';
console.log(
  `⚡ Rate limit: ${config.rateLimitMax} requests / 15 min per IP (${rateLimitBackend})`
);
