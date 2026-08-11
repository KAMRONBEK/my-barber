/* eslint-env jest */

// jest.setup.ts globally auto-mocks this module for every test file
// (`jest.mock('./config/config')`) so services can import `config` without
// hitting real env validation. validateConfig() itself isn't exported — it
// only runs as a side effect of importing the module — so testing it means
// unmocking here and reimporting fresh per env-var combination.
jest.unmock('../../config/config');

describe('config/config validateConfig', () => {
  const REQUIRED_ENV = {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-config-tests-only-32chars-min',
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_PRIVATE_KEY:
      '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n',
    FIREBASE_CLIENT_EMAIL: 'sa@test-project.iam.gserviceaccount.com',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'test-access-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret-key',
    AWS_S3_BUCKET: 'my-standard-bucket',
  };

  const originalEnv = process.env;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ...REQUIRED_ENV };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadConfig() {
    return import('../../config/config');
  }

  it('throws when a required env var is missing', async () => {
    delete process.env.AWS_S3_BUCKET;

    await expect(loadConfig()).rejects.toThrow(
      /Missing required environment variables: AWS_S3_BUCKET/
    );
  });

  it('throws when Firebase credentials are incomplete', async () => {
    delete process.env.FIREBASE_PRIVATE_KEY;

    await expect(loadConfig()).rejects.toThrow(
      /Firebase configuration incomplete/
    );
  });

  it('warns but does not crash when AWS_S3_BUCKET looks like an S3 Express One Zone directory bucket', async () => {
    process.env.AWS_S3_BUCKET = 'my-barber-uploads--usw2-az1--x-s3';

    const { config } = await loadConfig();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('S3 Express One Zone directory bucket')
    );
    expect(config.awsS3Bucket).toBe('my-barber-uploads--usw2-az1--x-s3');
  });

  it('does not warn for a standard S3 bucket name', async () => {
    await loadConfig();

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
