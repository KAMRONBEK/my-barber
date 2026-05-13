# Image Compression Strategy

This API uses two different compression strategies depending on the image type and use case.

## Strategy Overview

### 1. **Avatar Images** - Aggressive Compression

- **Endpoint**: `PUT /barber/update-avatar` & `PUT /client/update-avatar`
- **Priority**: Small file size for fast loading
- **Use case**: Profile pictures that are displayed small and frequently

### 2. **Portfolio Images** - High Quality Compression

- **Endpoint**: `POST /barber/add-image`
- **Priority**: Visual quality for client evaluation
- **Use case**: Barber setup/work images that clients examine closely

## Detailed Settings

| Setting               | Avatar (Lossy) | Portfolio (Near Lossless)         |
| --------------------- | -------------- | --------------------------------- |
| **Max Size**          | 50KB           | 800KB                             |
| **Quality**           | 85%            | 95%                               |
| **Max Width**         | 300px          | 1600px                            |
| **Max Height**        | 300px          | No limit (maintains aspect ratio) |
| **Format**            | JPEG           | JPEG                              |
| **Compression Ratio** | ~90-95%        | ~20-40%                           |

## Why Different Strategies?

### Avatar Images (Aggressive Compression)

- **Small display size**: Usually shown as 50-100px thumbnails
- **Frequent loading**: Loaded on every user interaction
- **Network efficiency**: Multiple avatars loaded simultaneously
- **Storage cost**: Thousands of avatars add up quickly
- **Quality tolerance**: Users accept lower quality for profile pics

### Portfolio Images (High Quality)

- **Large display size**: Shown full-screen or in galleries
- **Critical evaluation**: Clients judge barber quality from these
- **Infrequent loading**: Only loaded when viewing barber profiles
- **Business impact**: Poor quality images lose customers
- **Quality requirement**: Must show fine details of haircuts/setups

## Technical Implementation

### Avatar Compression Process

1. Resize to 300x300px (square crop)
2. Apply 85% JPEG quality
3. Compress until ≤50KB
4. If still too large, reduce quality further

### Portfolio Compression Process

1. Resize to max 1600px width (maintain aspect ratio)
2. Apply 95% JPEG quality (near lossless)
3. Compress until ≤800KB
4. Preserve fine details and color accuracy

## File Size Examples

### Before Compression (typical phone photo)

- **Original**: 8-15MB (4000x3000px, 12MP)

### After Avatar Compression

- **Result**: 30-50KB (300x300px)
- **Reduction**: 99.5% smaller
- **Quality**: Good for profile display

### After Portfolio Compression

- **Result**: 400-800KB (1600x1200px)
- **Reduction**: 90-95% smaller
- **Quality**: Excellent for detailed viewing

## Client-Side Recommendations

### For Avatars

```javascript
// Expo - aggressive compression
const result = await ImagePicker.launchImageLibraryAsync({
  quality: 0.6, // Lower quality is fine
  allowsEditing: true, // Square crop
  aspect: [1, 1], // Force square
});
```

### For Portfolio Images

```javascript
// Expo - preserve quality
const result = await ImagePicker.launchImageLibraryAsync({
  quality: 0.9, // High quality
  allowsEditing: false, // Don't force crop
  // No aspect ratio restriction
});
```

## Benefits

### For Users

- **Fast avatar loading**: Profile pics load instantly
- **High-quality portfolios**: Can see barber work clearly
- **Better UX**: Appropriate quality for each use case

### For Business

- **Reduced storage costs**: Avatars take minimal space
- **Better conversions**: High-quality portfolios attract clients
- **Faster app performance**: Optimized for each image type

### For Developers

- **Automatic optimization**: No manual intervention needed
- **Consistent results**: Predictable file sizes
- **Scalable**: Works with thousands of images

## Monitoring

The system logs compression statistics for both types:

```javascript
// Avatar compression log
{
  "type": "avatar",
  "originalSize": 8388608,    // 8MB
  "compressedSize": 45056,    // 44KB
  "compressionRatio": "99.46%",
  "dimensions": "300x300"
}

// Portfolio compression log
{
  "type": "portfolio",
  "originalSize": 8388608,    // 8MB
  "compressedSize": 655360,   // 640KB
  "compressionRatio": "92.19%",
  "dimensions": "1600x1200"
}
```

This dual strategy ensures optimal performance and user experience for both use cases.
