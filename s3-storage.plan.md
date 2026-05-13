# Migrate to AWS S3 Storage with Signed URLs

## Environment Variables Required

Add these to your `.env` files:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_SIGNED_URL_EXPIRATION=3600
```

## Implementation Changes

### 1. Install AWS SDK

Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` packages.

### 2. Update Config (`config/config.ts`)

- Add AWS configuration interface properties (region, accessKeyId, secretAccessKey, s3Bucket, signedUrlExpiration)
- Add validation for required AWS environment variables
- Remove or keep Firebase config based on other dependencies

### 3. Rewrite FileStorageService (`services/fileStorage.ts`)

Replace Firebase Storage implementation with AWS S3:

- Initialize S3Client with credentials
- Update `uploadFile()` to use S3 PutObjectCommand with user-ID-based folder structure: `{userId}/{uuid}.{ext}`
- **Store and return S3 key** (full path like `user-123/abc-123.jpg`) in `UploadResult.fileName` - this is what gets saved in database
- Remove `makePublic()` calls - files will be private by default
- Update `getSignedUrl()` to use S3's `getSignedUrl()` with GetObjectCommand (accepts the stored S3 key)
- Update `deleteFile()` to use S3 DeleteObjectCommand
- Update `fileExists()` to use S3 HeadObjectCommand
- Update `getFileMetadata()` to use S3 HeadObjectCommand
- Remove `getPublicUrl()` method (replaced by signed URLs)
- Add `userId` parameter to upload methods
- **Update `isValidFileSize()` helper to accept 15MB max** (change from current 5MB default)

### 4. Update Upload Result Interface

Modify `UploadResult` in `services/fileStorage.ts`:

- Remove `publicUrl` field (replaced by signed URL generation on-demand)
- Keep `fileName` (stores S3 key like `user-123/file.jpg`) and `fileUrl` for storage path reference

### 5. Remove Image Compression

- **Delete `services/imageCompressionService.ts`** (no longer needed)
- Update `middleware/upload.ts`:
  - Remove all compression-related imports and logic
  - Remove `compress` parameter from all middleware functions
  - Remove `uploadAvatar()` and `uploadPortfolio()` specialized middleware (just use `uploadSingle`/`uploadMultiple`)
  - Update file size validation to 15MB across all upload middleware
  - Remove `CompressedImageResult` from request interface
  - Simplify middleware to only validate and pass files to storage service

### 6. Update Service Layer

Modify services that use file storage (`barberService.ts`, `clientService.ts`):

- Pass userId when calling `uploadFile()`
- Generate signed URLs when returning file URLs to clients
- Update avatar/image handling to use signed URLs
- Update to use `req.uploadedFile` instead of `req.compressedFile`

### 7. Update Routes/Controllers

Update upload endpoints (`routes/barber.ts`, `routes/client.ts`):

- Remove references to compressed files
- Update middleware to use simplified upload functions without compression
- Generate signed URLs before responding with file data
- Use stored S3 keys from database to generate signed URLs on-demand

## Files to Modify

- `package.json` - Add AWS SDK dependencies
- `config/config.ts` - AWS configuration
- `services/fileStorage.ts` - Complete rewrite for S3, update file size limit to 15MB
- `services/imageCompressionService.ts` - **DELETE THIS FILE**
- `middleware/upload.ts` - Remove compression logic, update to 15MB limit
- `services/barberService.ts` - Pass userId, handle signed URLs, use uploadedFile
- `services/clientService.ts` - Pass userId, handle signed URLs, use uploadedFile
- `routes/barber.ts` - Update middleware calls, generate signed URLs
- `routes/client.ts` - Update middleware calls, generate signed URLs

