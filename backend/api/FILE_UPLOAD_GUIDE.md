# File Upload Guide

This API supports file uploads for images using base64 encoding. The frontend can send images as base64 strings in JSON requests.

## Supported Endpoints

### Client Routes

#### Upload Avatar

- **Endpoint**: `PUT /api/client/update-avatar`
- **Authentication**: Required (Bearer token)
- **Field Name**: `avatar`
- **Note**: Automatically deletes the previous avatar if one exists

### Barber Routes

#### Upload Avatar

- **Endpoint**: `PUT /api/barber/update-avatar`
- **Authentication**: Required (Bearer token)
- **Field Name**: `avatar`
- **Note**: Automatically deletes the previous avatar if one exists

#### Upload Portfolio Images

- **Endpoint**: `POST /api/barber/add-image`
- **Authentication**: Required (Bearer token)
- **Field Name**: `images`
- **Max Files**: 5

## Request Format

### Single File Upload (Avatar)

You can send image data in two formats:

#### Format 1: Direct Data URL

```json
{
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

#### Format 2: Object Format

```json
{
  "avatar": {
    "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
    "filename": "avatar.jpg",
    "mimeType": "image/jpeg"
  }
}
```

### Multiple Files Upload (Portfolio)

For multiple files, send an array:

#### Format 1: Array of Data URLs

```json
{
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQ..."
  ]
}
```

#### Format 2: Array of Objects

```json
{
  "images": [
    {
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
      "filename": "portfolio1.jpg",
      "mimeType": "image/jpeg"
    },
    {
      "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQ...",
      "filename": "portfolio2.png",
      "mimeType": "image/png"
    }
  ]
}
```

## Response Format

### Single File Response

```json
{
  "ok": true,
  "message": "Avatar uploaded successfully",
  "file": {
    "url": "https://storage.googleapis.com/bucket/avatars/uuid.jpeg",
    "originalSize": 1024000,
    "compressedSize": 102400,
    "compressionRatio": "90.00%"
  }
}
```

### Multiple Files Response

```json
{
  "ok": true,
  "message": "Images uploaded successfully",
  "files": [
    {
      "url": "https://storage.googleapis.com/bucket/portfolio/uuid1.jpeg",
      "originalSize": 2048000,
      "compressedSize": 204800,
      "compressionRatio": "90.00%"
    },
    {
      "url": "https://storage.googleapis.com/bucket/portfolio/uuid2.jpeg",
      "originalSize": 1536000,
      "compressedSize": 153600,
      "compressionRatio": "90.00%"
    }
  ]
}
```

## File Validation

### Supported Image Types

- JPEG (`image/jpeg`)
- JPG (`image/jpg`)
- PNG (`image/png`)
- GIF (`image/gif`)
- WebP (`image/webp`)

### File Size Limits

- Maximum file size: 4MB per file
- Files are automatically compressed to optimize storage

### Compression Settings

#### Avatar Compression (Aggressive - Small File Size Priority)

- Max size: 50KB
- Quality: 85%
- Dimensions: 300x300px
- Format: JPEG
- **Purpose**: Profile pictures where small file size is more important than quality

#### Portfolio Images Compression (High Quality - Visual Quality Priority)

- Max size: 800KB
- Quality: 95% (near lossless)
- Max width: 1600px
- Format: JPEG
- **Purpose**: Barber setup/work images where clients need to see clear details

## Frontend Implementation Examples

### JavaScript/TypeScript Example

```typescript
// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Upload avatar
async function uploadAvatar(file: File, token: string) {
  const base64 = await fileToBase64(file);

  const response = await fetch('/api/client/update-avatar', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      avatar: base64,
    }),
  });

  return response.json();
}

// Upload multiple portfolio images
async function uploadPortfolioImages(files: File[], token: string) {
  const base64Files = await Promise.all(files.map(file => fileToBase64(file)));

  const response = await fetch('/api/barber/add-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      images: base64Files,
    }),
  });

  return response.json();
}
```

### React Example with File Input

```tsx
import React, { useState } from 'react';

function AvatarUpload() {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const base64 = await fileToBase64(file);
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/client/update-avatar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatar: base64,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        console.log('Avatar uploaded:', result.file.url);
        console.log('Compression ratio:', result.file.compressionRatio);
      } else {
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## Error Handling

### Common Error Responses

#### Invalid File Type

```json
{
  "ok": false,
  "error": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
}
```

#### File Too Large

```json
{
  "ok": false,
  "error": "File size too large. Maximum size is 4MB."
}
```

#### Invalid Base64 Format

```json
{
  "ok": false,
  "error": "Invalid file data format. Expected base64 string or file object."
}
```

#### Too Many Files

```json
{
  "ok": false,
  "error": "Too many files. Maximum allowed: 5"
}
```

#### Authentication Required

```json
{
  "ok": false,
  "error": "Access denied. Client account required."
}
```

## Automatic File Management

### Avatar Replacement

When uploading a new avatar (both client and barber), the system automatically:

1. Retrieves the current avatar URL from the database
2. Deletes the old avatar file from Firebase Storage
3. Uploads and saves the new avatar
4. Updates the database with the new avatar URL

This ensures that old avatar files don't accumulate in storage, keeping storage costs minimal and preventing orphaned files.

### Error Handling for File Deletion

If the old avatar deletion fails (e.g., file already deleted, network issues), the system:

- Logs a warning but continues with the upload
- Does not fail the entire avatar update operation
- Ensures the new avatar is still uploaded and saved successfully

### Avatar URL Validation

The system automatically validates avatar URLs when users access their profiles:

1. **Real-time Validation**: When `getMe` endpoints are called, the system checks if the avatar URL points to an existing file
2. **Automatic Cleanup**: If an avatar URL is broken (file doesn't exist), it's automatically removed from the database
3. **Graceful Handling**: Users receive `null` for avatar instead of broken URLs
4. **Background Logging**: All cleanup actions are logged for monitoring

This prevents users from seeing broken image links and keeps the database clean.

## Benefits

1. **No Multipart Handling**: Simpler frontend implementation without FormData
2. **Automatic Compression**: All images are optimized for storage and bandwidth
3. **Consistent API**: Same JSON request/response format across all endpoints
4. **Firebase Storage**: Reliable cloud storage with public URLs
5. **Automatic Cleanup**: Old avatars are automatically deleted to prevent storage bloat
6. **Validation**: Built-in file type and size validation
7. **Compression Metrics**: Response includes compression statistics

## Migration from Multipart

If you're migrating from multipart/form-data uploads:

1. Replace `FormData` with JSON body
2. Convert files to base64 before sending
3. Update Content-Type header to `application/json`
4. Update response handling to use new format

The API endpoints remain the same, only the request format changes.
