# File Organization Structure

This document outlines the file organization structure for Firebase Storage uploads in the My Barber API.

## Folder Structure

```
Firebase Storage/
├── client-avatars/          # Client profile pictures
├── barber-avatars/          # Barber profile pictures
├── barber-portfolio/        # Barber work/setup images
└── uploads/                 # Other miscellaneous files
```

## File Upload Endpoints

### Client Endpoints

#### Upload Client Avatar

- **Endpoint**: `PUT /api/client/update-avatar`
- **Folder**: `client-avatars/`
- **File Type**: Single image file
- **Purpose**: Client profile picture
- **Authentication**: Required (Client only)

### Barber Endpoints

#### Upload Barber Avatar

- **Endpoint**: `PUT /api/barber/update-avatar`
- **Folder**: `barber-avatars/`
- **File Type**: Single image file
- **Purpose**: Barber profile picture
- **Authentication**: Required (Barber only)

#### Upload Portfolio Images

- **Endpoint**: `POST /api/barber/add-image`
- **Folder**: `barber-portfolio/`
- **File Type**: Multiple image files (max 5)
- **Purpose**: Barber work samples and setup images
- **Authentication**: Required (Barber only)

## File Validation

All image uploads are validated for:

- **File Types**: JPEG, JPG, PNG, GIF, WebP
- **File Size**: Maximum 5MB per file
- **Security**: Files are scanned and validated before upload

## Storage Configuration

- **Storage Provider**: Firebase Storage
- **Access Control**: Public read access for uploaded files
- **URL Format**: `https://storage.googleapis.com/{bucket-name}/{folder}/{filename}`
- **File Naming**: UUID-based naming to prevent conflicts

## Implementation Details

### Upload Middleware

The upload functionality uses JSON-based base64 uploads with the following middleware functions:

```typescript
// Single file upload (avatar)
uploadAvatar('avatar', 'folder-name');

// Multiple file upload (portfolio)
uploadPortfolio('images', maxFiles, 'folder-name');
```

### Service Layer

File URLs are stored in Firestore:

- **Client Avatar**: Stored in `clients.avatar` field
- **Barber Avatar**: Stored in `barbers.avatar` field
- **Barber Portfolio**: Stored in `barbers.images` array field

### Response Format

All upload endpoints return:

```json
{
  "ok": true,
  "message": "Upload successful",
  "uploadedFile": {
    "fileName": "folder/uuid.ext",
    "fileUrl": "folder/uuid.ext",
    "publicUrl": "https://storage.googleapis.com/bucket/folder/uuid.ext"
  }
}
```

## Migration Notes

### Changes Made

1. **Added Barber Avatar Support**: New avatar field and upload endpoint for barbers
2. **Renamed Folder**: Changed `barber-images` to `barber-portfolio` for clarity
3. **Consistent URL Handling**: All services now receive `publicUrl` strings

### Backward Compatibility

- Existing barber portfolio images remain accessible
- Client avatar functionality unchanged
- All existing file URLs continue to work
