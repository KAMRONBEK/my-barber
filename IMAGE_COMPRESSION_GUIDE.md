# Image Compression Service Guide

This guide explains how to use the new image compression service that automatically compresses uploaded images to a maximum of 100KB while maintaining quality.

## Overview

The image compression service provides:

- **Automatic compression** to 100KB or less
- **Lossless compression** when possible, lossy when necessary
- **Format optimization** (JPEG, PNG, WebP)
- **Automatic resizing** if quality reduction isn't enough
- **Detailed compression metrics**

## Features

### Compression Strategy

1. **Quality reduction**: Starts with 80% quality and reduces by 10% each iteration
2. **Format optimization**: Chooses the best format based on input type
3. **Aggressive resizing**: If quality reduction fails, reduces dimensions by 20% each iteration
4. **Minimum quality**: Won't go below 10% quality
5. **Minimum dimensions**: Won't resize below 100x100 pixels

### Supported Formats

- **Input**: JPEG, JPG, PNG, GIF, WebP
- **Output**: JPEG, PNG, WebP (optimized based on input)

## Usage

### 1. Image Compression Service

```typescript
import { imageCompressionService } from '../services/imageCompressionService';

// Compress and upload a single image
const result = await imageCompressionService.compressAndUploadImage(
  imageBuffer,
  'photo.jpg',
  'image/jpeg',
  'uploads',
  {
    maxSizeKB: 100,
    quality: 80,
    width: 800,
    height: 600,
    format: 'jpeg',
  }
);

console.log('Compression ratio:', result.compressionRatio);
console.log('Public URL:', result.publicUrl);
```

### 2. Compressed Upload Middleware

#### Single Image Upload

```typescript
import { uploadCompressedSingle } from '../middleware/compressedUpload';

router.post(
  '/upload-image',
  uploadCompressedSingle('image', 'photos', { maxSizeKB: 100 }),
  (req, res) => {
    const compressedFile = (req as any).compressedFile;
    res.json({
      url: compressedFile.publicUrl,
      compression: `${compressedFile.compressionRatio.toFixed(2)}%`,
    });
  }
);
```

#### Multiple Images Upload

```typescript
import { uploadCompressedMultiple } from '../middleware/compressedUpload';

router.post(
  '/upload-gallery',
  uploadCompressedMultiple('images', 5, 'gallery', { maxSizeKB: 100 }),
  (req, res) => {
    const compressedFiles = (req as any).compressedFiles;
    res.json({
      files: compressedFiles.map(file => ({
        url: file.publicUrl,
        compression: `${file.compressionRatio.toFixed(2)}%`,
      })),
    });
  }
);
```

#### Avatar Upload (Preset Configuration)

```typescript
import { uploadCompressedAvatar } from '../middleware/compressedUpload';

router.put(
  '/update-avatar',
  uploadCompressedAvatar('avatar', 'avatars'),
  (req, res) => {
    // Avatar is automatically resized to 300x300 and compressed to 50KB
    const avatar = (req as any).compressedFile;
    res.json({ avatarUrl: avatar.publicUrl });
  }
);
```

#### Portfolio Images (Preset Configuration)

```typescript
import { uploadCompressedPortfolio } from '../middleware/compressedUpload';

router.post(
  '/add-portfolio',
  uploadCompressedPortfolio('images', 10, 'portfolio'),
  (req, res) => {
    // Images are automatically resized to max 800px width and compressed to 100KB
    const images = (req as any).compressedFiles;
    res.json({ imageUrls: images.map(img => img.publicUrl) });
  }
);
```

## Configuration Options

### ImageCompressionOptions

```typescript
interface ImageCompressionOptions {
  maxSizeKB: number; // Maximum file size in KB (default: 100)
  quality: number; // Initial quality 1-100 (default: 80)
  format?: 'jpeg' | 'png' | 'webp'; // Output format (auto-detected if not specified)
  width?: number; // Maximum width in pixels
  height?: number; // Maximum height in pixels
}
```

### Preset Configurations

#### Avatar Settings (Aggressive Compression)

- **Max size**: 50KB
- **Quality**: 85%
- **Dimensions**: 300x300px
- **Format**: JPEG
- **Use case**: Profile pictures where file size matters more than quality

#### Portfolio Settings (High Quality)

- **Max size**: 800KB
- **Quality**: 95% (near lossless)
- **Max width**: 1600px
- **Format**: JPEG
- **Use case**: Barber setup/work images where visual quality is crucial

## Response Format

### Compressed Image Result

```typescript
interface CompressedImageResult {
  fileName: string; // Generated filename
  fileUrl: string; // Internal storage path
  publicUrl: string; // Public access URL
  originalSize: number; // Original file size in bytes
  compressedSize: number; // Compressed file size in bytes
  compressionRatio: number; // Compression ratio as percentage
}
```

### Example Response

```json
{
  "ok": true,
  "message": "Image uploaded and compressed successfully",
  "compressedFile": {
    "publicUrl": "https://storage.googleapis.com/bucket/avatars/uuid.jpg",
    "originalSize": 2048576,
    "compressedSize": 51200,
    "compressionRatio": "97.50%"
  }
}
```

## Error Handling

The service handles various error scenarios:

### File Type Validation

```json
{
  "ok": false,
  "error": "Invalid file type. Only JPEG, PNG, JPG, GIF, and WebP are allowed."
}
```

### Compression Failure

```json
{
  "ok": false,
  "error": "Image compression failed. Please try with a different image."
}
```

### File Size Limits

```json
{
  "ok": false,
  "error": "File size too large. Maximum size is 4MB."
}
```

## Migration from Old Upload System

### Before (using regular upload)

```typescript
import { uploadSingle } from '../middleware/upload';

router.post('/upload', uploadSingle('image', 'photos'), (req, res) => {
  const file = (req as any).uploadedFile;
  // File might be several MB in size
});
```

### After (using compressed upload)

```typescript
import { uploadCompressedSingle } from '../middleware/compressedUpload';

router.post(
  '/upload',
  uploadCompressedSingle('image', 'photos'),
  (req, res) => {
    const file = (req as any).compressedFile;
    // File is guaranteed to be ≤100KB
  }
);
```

## Performance Considerations

- **Processing time**: Compression adds 1-3 seconds per image depending on size and complexity
- **Memory usage**: Sharp is memory-efficient but large images may require more RAM
- **Storage savings**: Typically 70-95% reduction in file size
- **Quality**: Minimal visual quality loss for web usage

## Best Practices

1. **Use appropriate presets**: Avatar vs Portfolio vs Custom
2. **Set reasonable limits**: Don't compress below necessary quality
3. **Monitor compression ratios**: Log compression statistics for optimization
4. **Handle errors gracefully**: Provide fallback options for compression failures
5. **Test with various image types**: Ensure compatibility across formats

## Dependencies

- **Sharp**: High-performance image processing library
- **Firebase Storage**: Cloud storage for compressed images
- **Multer**: File upload handling

## Installation

The image compression service is already installed and configured. To use it in new routes:

1. Import the appropriate middleware
2. Add it to your route handlers
3. Access compressed files via `req.compressedFile` or `req.compressedFiles`

## Examples in Current Codebase

- **Avatar upload**: `/barber/update-avatar` - Uses `uploadCompressedAvatar`
- **Portfolio images**: `/barber/add-image` - Uses `uploadCompressedPortfolio`

Both routes now automatically compress images to the specified limits while maintaining visual quality.
