# 📚 Documentation Index

This directory contains all documentation for the My Barber API project.

## 📋 **Core Documentation**

### **Setup & Deployment**

- [Main README](../README.md) - Project overview and quick start
- [Environment Setup](../ENVIRONMENTS.md) - Two-Firebase-project configuration
- [Deployment Guide](../DEPLOYMENT_GUIDE.md) - Complete Vercel deployment instructions

### **API Documentation**

- [Swagger Implementation](../SWAGGER_IMPLEMENTATION.md) - OpenAPI documentation setup
- [File Upload Guide](../FILE_UPLOAD_GUIDE.md) - Image upload with JSON/base64
- [Image Compression Guide](../IMAGE_COMPRESSION_GUIDE.md) - Automatic image optimization

### **Development**

- [File Organization](../FILE_ORGANIZATION.md) - Project structure overview
- [Postman Collection](../postman.json) - API testing collection

## 🏗️ **Architecture Overview**

### **Project Structure**

```
my-barber-api/
├── server.ts              # Main server entry point
├── routes/                # API route definitions
│   ├── auth.ts           # Authentication endpoints
│   ├── barber.ts         # Barber management
│   ├── client.ts         # Client management
│   ├── system.ts         # Health, metrics, API info
│   └── test.ts           # Test endpoints
├── services/             # Business logic services
├── middleware/           # Express middleware
├── models/               # TypeScript interfaces
├── config/               # Configuration files
├── utils/                # Utility functions
└── docs/                 # Documentation (this directory)
```

### **Key Features**

- ✅ **Clean Architecture**: Separated routes, services, and middleware
- ✅ **TypeScript**: Full type safety throughout
- ✅ **Firebase Integration**: Firestore + Storage + Auth
- ✅ **Image Processing**: Automatic compression and optimization
- ✅ **JSON File Uploads**: Base64 image uploads via JSON API
- ✅ **Real-time Validation**: Avatar URL validation and cleanup
- ✅ **Push Notifications**: Expo notification testing
- ✅ **Comprehensive Logging**: Winston with structured JSON logs
- ✅ **Metrics & Monitoring**: Prometheus metrics collection
- ✅ **API Documentation**: Interactive Swagger UI

## 🚀 **Quick Links**

- **API Documentation**: `/docs` endpoint (Swagger UI)
- **Health Check**: `/health` endpoint
- **Metrics**: `/metrics` endpoint (Prometheus format)
- **Test Notifications**: `/test/send-notification` endpoint

## 📝 **Recent Updates**

### **Codebase Restructuring (Latest)**

- Moved system endpoints (health, metrics, API info) to `routes/system.ts`
- Moved test endpoints to `routes/test.ts`
- Removed unused `middleware/compressedUpload.ts`
- Cleaned up duplicate documentation files
- Organized documentation in `docs/` directory

### **File Upload System**

- Replaced multipart uploads with JSON-based base64 uploads
- Maintained existing endpoint URLs for backward compatibility
- Added automatic image compression and Firebase Storage integration
- Implemented real-time avatar URL validation and cleanup

### **Notification System**

- Added test notification endpoint for Expo push notifications
- Supports custom titles, bodies, and data payloads
- Integrated with existing notification service

## 🔧 **Development Workflow**

1. **Local Development**: `npm run dev`
2. **Build**: `npm run build`
3. **Test**: Use Postman collection or Swagger UI
4. **Deploy**: Push to appropriate branch (development/staging/main)

## 📞 **Support**

For questions or issues:

1. Check the relevant documentation file
2. Review the Swagger API documentation at `/docs`
3. Check server logs for detailed error information
4. Use the test endpoints to verify functionality
