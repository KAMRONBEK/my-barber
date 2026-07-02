/** Jest manual mock for ../config — avoids real env validation */
export const config = {
  port: 8080,
  nodeEnv: 'test',
  firebaseProjectId: 'test-project',
  firebasePrivateKey:
    '-----BEGIN PRIVATE KEY-----\nTESTKEY\n-----END PRIVATE KEY-----\n',
  firebaseClientEmail: 'firebase-adminsdk@test-project.iam.gserviceaccount.com',
  firebaseStorageBucket: 'test-bucket',
  jwtSecret:
    'test-jwt-secret-key-for-integration-tests-only-32chars-minimum-xx',
  fileUrl: 'https://example.com',
  expoAccessToken: undefined,
  corsOrigin: '*',
  rateLimitMax: 100000,
  redisUrl: undefined,
  awsRegion: 'us-east-1',
  awsAccessKeyId: 'test-access-key',
  awsSecretAccessKey: 'test-secret-key',
  awsS3Bucket: 'test-uploads-bucket',
  awsS3KeyPrefixNormalized: 'test/',
  get adminUidAllowlist() {
    return (process.env.ADMIN_UID_ALLOWLIST || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  },
  get adminApiKey() {
    return process.env.ADMIN_API_KEY?.trim() || undefined;
  },
  get cronApiKey() {
    return process.env.CRON_API_KEY?.trim() || undefined;
  },
};

export const AWS_S3_SIGNED_URL_TTL_SECONDS = 3600;

export function normalizeAwsS3KeyPrefix(prefix: string | undefined): string {
  if (!prefix?.trim()) {
    return '';
  }
  const trimmed = prefix.trim().replace(/^\/+/g, '');
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}
