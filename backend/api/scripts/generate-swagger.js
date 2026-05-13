const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const { sharedSchemas } = require('./swagger-shared-schemas');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My Barber API',
      version: '1.0.0',
      description:
        'Barber booking API built with Node.js and TypeScript.\n\n**Schemas:** `components.schemas` mirrors TypeScript types in `models/` (e.g. `BookingStatus`, `BookingContract` ↔ `models/booking.ts`; barber approval ↔ `models/barber.ts`). Enumerations are OpenAPI `enum`s; request/response bodies use `$ref` where noted.',
      contact: {
        name: 'API Support',
        email: 'support@my-barber.uz',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://api.my-barber.uz',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.my-barber.uz',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Barber/client JWT from login endpoints, or a Firebase Auth ID token with custom claim admin:true / role:admin for Admin routes. Dev/bootstrap: JWT whose user `id` is in ADMIN_UID_ALLOWLIST.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            details: {
              type: 'array',
              description:
                'Optional express-validator errors (ValidationError[] style).',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:45.123Z',
            },
            uptime: {
              type: 'number',
              example: 1234.567,
            },
            environment: {
              type: 'string',
              example: 'production',
            },
          },
        },
        APIInfo: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'My Barber API',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
            description: {
              type: 'string',
              example: 'Barber booking API built with Node.js and TypeScript',
            },
            environment: {
              type: 'string',
              example: 'production',
            },
            endpoints: {
              type: 'object',
            },
            links: {
              type: 'object',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              example: 'johndoe',
            },
            password: {
              type: 'string',
              example: 'password123',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'password', 'firstName', 'lastName'],
          properties: {
            username: {
              type: 'string',
              example: 'johndoe',
            },
            password: {
              type: 'string',
              example: 'password123',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            phone: {
              type: 'string',
              example: '+998901234567',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '12345',
                },
                username: {
                  type: 'string',
                  example: 'johndoe',
                },
                type: {
                  $ref: '#/components/schemas/UserRole',
                  example: 'client',
                },
              },
            },
          },
        },
        ...sharedSchemas(),
      },
    },
    tags: [
      {
        name: 'System',
        description: 'System health and information endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and registration',
      },
      {
        name: 'Barber',
        description: 'Barber management endpoints',
      },
      {
        name: 'Client',
        description: 'Client management endpoints',
      },
      {
        name: 'Notifications',
        description: 'In-app notification inbox',
      },
      {
        name: 'Public',
        description: 'Unauthenticated catalog and public reviews',
      },
      {
        name: 'Trust',
        description: 'Reports and user blocks',
      },
      {
        name: 'Admin',
        description:
          'Staff-only moderation, CMS, and statistics (see middleware/adminAuth.ts for auth modes)',
      },
      {
        name: 'Development',
        description:
          'Non-production helpers (testing logging / push); may be disabled in some deployments.',
      },
    ],
  },
  // Scan TypeScript source files for JSDoc comments
  apis: [
    './routes/*.ts',
    './routes/auth.ts',
    './routes/barber.ts',
    './routes/client.ts',
    './routes/system.ts',
  ],
};

// Generate OpenAPI specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

function augmentPaths(spec) {
  spec.paths = spec.paths || {};
  const extra = {
    '/metrics': {
      get: {
        tags: ['System'],
        summary: 'Prometheus metrics',
        description:
          'Plain-text Prometheus exposition format (process + HTTP metrics).',
        responses: {
          200: {
            description: 'Prometheus text format',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: '# HELP http_request_duration_seconds ...',
                },
              },
            },
          },
        },
      },
    },
    '/docs.json': {
      get: {
        tags: ['System'],
        summary: 'OpenAPI specification (JSON)',
        responses: {
          200: {
            description: 'OpenAPI 3.0 document',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OpenApiSpecRoot',
                },
              },
            },
          },
        },
      },
    },
    '/docs': {
      get: {
        tags: ['System'],
        summary: 'Swagger UI (HTML)',
        description: 'Browser UI backed by /docs.json.',
        responses: {
          200: {
            description: 'HTML page',
            content: {
              'text/html': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
    '/test/send-notification': {
      post: {
        tags: ['Development'],
        summary: 'Send a test Expo notification',
        description:
          'Development helper; requires valid Expo push token. Do not rely on in production clients.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TestNotificationRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Notification accepted for delivery',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestNotificationResponse' },
              },
            },
          },
          400: {
            description: 'Missing deviceToken',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          500: {
            description: 'Send failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/test/logging': {
      get: {
        tags: ['Development'],
        summary: 'Emit test log lines (debug)',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestLoggingResponse' },
              },
            },
          },
        },
      },
    },
  };
  Object.assign(spec.paths, extra);
}

function ensureMergedComponents(spec) {
  const base = swaggerOptions.definition.components || {};
  spec.components = spec.components || {};
  spec.components.securitySchemes = {
    ...base.securitySchemes,
    ...(spec.components.securitySchemes || {}),
  };
  spec.components.schemas = {
    ...base.schemas,
    ...(spec.components.schemas || {}),
  };
}

ensureMergedComponents(swaggerSpec);
augmentPaths(swaggerSpec);

// Write to file
const outputPath = path.join(__dirname, '..', 'public', 'swagger.json');
const publicDir = path.join(__dirname, '..', 'public');

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log('✅ Swagger specification generated at:', outputPath);
console.log('📊 Total paths:', Object.keys(swaggerSpec.paths || {}).length);

