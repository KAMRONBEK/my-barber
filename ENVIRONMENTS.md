# Environment Configuration

This project uses a two-Firebase-project setup for better resource isolation and security.

## Firebase Project Structure

### Staging Firebase Project
- **Used by**: Development and Staging environments
- **Purpose**: Safe testing and development
- **Project naming**: `my-barber-staging` or similar
- **Service account file**: `firebase-service-account-key-staging.json`

### Production Firebase Project
- **Used by**: Production environment only
- **Purpose**: Live application data
- **Project naming**: `my-barber-production` or similar
- **Service account file**: `firebase-service-account-key-production.json`

## Environment Mapping

| Environment | NODE_ENV | Firebase Project | Rate Limit | CORS |
|-------------|----------|------------------|------------|------|
| Development | `development` | Staging | 1000/15min | `*` (permissive) |
| Staging | `staging` | Staging | 200/15min | Restricted domains |
| Production | `production` | Production | 100/15min | Restricted domains |

## Configuration Files

- `.env.development` → Uses staging Firebase project
- `.env.staging` → Uses staging Firebase project  
- `.env.production` → Uses production Firebase project

## Benefits

1. **Data Isolation**: Production data is completely separate from development/testing
2. **Security**: Production credentials are only used in production
3. **Cost Management**: Development activity doesn't affect production Firebase usage
4. **Safe Testing**: Can test destructive operations safely in staging project
5. **Realistic Testing**: Staging environment mirrors production configuration
6. **Team Collaboration**: Developers can share staging environment for testing

## Setup Steps

1. Create two Firebase projects (staging and production)
2. Configure both projects with Firestore and Storage
3. Download service account keys for both projects
4. Configure environment files with appropriate project credentials
5. Deploy to respective environments using project-specific configurations

## Environment-Specific Settings

### Development
- **Purpose**: Local development
- **Rate Limiting**: Very permissive (1000 requests/15min)
- **CORS**: Open (`*`)
- **Firebase**: Uses staging project (shared with staging environment)

### Staging
- **Purpose**: Pre-production testing
- **Rate Limiting**: Moderate (200 requests/15min)
- **CORS**: Restricted to staging domains
- **Firebase**: Uses staging project (shared with development environment)

### Production
- **Purpose**: Live application
- **Rate Limiting**: Restrictive (100 requests/15min)
- **CORS**: Restricted to production domains
- **Firebase**: Production project with strict security 