# Barber Booking API

A Node.js/TypeScript REST API for barber booking system, migrated from Go to provide better scalability and modern development practices.

## 🚀 **Features**

- **Authentication**: JWT-based auth for barbers and clients
- **File Storage**: Firebase Storage for images and documents
- **Database**: Firebase Firestore for scalable NoSQL storage
- **Monitoring**: Prometheus metrics and Winston logging
- **Push Notifications**: Expo push notifications support
- **Multi-Environment**: Development, Staging, and Production environments

## 🏗️ **Architecture**

- **Framework**: Express.js with TypeScript
- **Database**: Firebase Firestore
- **File Storage**: Firebase Storage
- **Authentication**: JWT middleware
- **Logging**: Winston with structured JSON logging
- **Metrics**: Prometheus metrics collection
- **Deployment**: Optimized for Vercel serverless deployment

## 📦 **Environment Setup**

### **Two-Firebase-Project Setup**
- **Staging Project**: Used by Development and Staging environments
- **Production Project**: Used by Production environment only

See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for detailed environment configuration.

## 🚀 **Deployment**

### **Vercel Deployment** (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to staging
npm run vercel:staging

# Deploy to production
npm run vercel:production
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete deployment guide.

### **Local Development**
```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env.development

# Configure your Firebase credentials in .env.development

# Run development server
npm run dev
```

## 📊 **Accessing Logs**

### **Vercel (Production)**
```bash
# Real-time logs
vercel logs --follow

# Staging environment
vercel logs --follow --environment staging

# Production environment
vercel logs --follow --environment production

# Export logs
vercel logs --since 1h > logs.txt
```

### **Local Development**
- Console output with colorized formatting
- File logs in `logs/development.log`

### **Test Logging**
```bash
# Test logging system
curl https://your-domain.vercel.app/test/logging
```

## 🔍 **API Endpoints**

### **Health & Monitoring**
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /test/logging` - Test logging system

### **Authentication**
- `POST /auth/barber/login` - Barber login
- `POST /auth/client/login` - Client login

### **Barber Management**
- `POST /barber/register` - Register new barber
- `GET /barber/profile` - Get barber profile
- `PUT /barber/profile` - Update barber profile
- `POST /barber/upload-image` - Upload barber image

### **Client Management**
- `POST /client/register` - Register new client
- `GET /client/profile` - Get client profile
- `PUT /client/profile` - Update client profile

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Server
PORT=8080
NODE_ENV=development

# Firebase (Staging Project for Dev/Staging)
FIREBASE_PROJECT_ID=your-firebase-project-staging
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Security
JWT_SECRET=your-jwt-secret-here

# CORS
CORS_ORIGIN=*
```

## 🛠️ **Development**

### **Scripts**
```bash
npm run dev          # Development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run lint         # Lint code
npm run test         # Run tests
```

### **Project Structure**
```
src/
├── config/          # Configuration files
├── middleware/      # Express middlewares
├── models/          # TypeScript interfaces
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
└── main.ts          # Application entry point
```

## 📈 **Monitoring**

### **Logging Levels**
- **Error**: System errors and exceptions
- **Warn**: Warning conditions
- **Info**: General information (default in production)
- **Debug**: Detailed debugging (development only)

### **Metrics Available**
- HTTP request duration
- Request count by endpoint
- Response status codes
- System uptime

## 🔐 **Security**

- **Rate Limiting**: 100-1000 requests per 15 minutes (environment dependent)
- **CORS**: Configurable origin restrictions
- **Helmet**: Security headers
- **JWT**: Secure authentication tokens
- **Input Validation**: Joi schema validation

## 📚 **Documentation**

- [Environment Setup](./ENVIRONMENTS.md)
- [Complete Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Swagger API Documentation](./SWAGGER_IMPLEMENTATION.md)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

MIT License - see [LICENSE](./LICENSE) file for details.

## Migration from Go

This API was rewritten from a Go implementation using:
- Echo framework → Express.js
- PostgreSQL → Firebase Firestore
- Local file storage → Firebase Storage
- Bun ORM → Firebase Admin SDK

All endpoints maintain compatibility with the original Go API structure. 