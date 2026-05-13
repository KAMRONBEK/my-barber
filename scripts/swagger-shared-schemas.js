'use strict';

/**
 * Shared OpenAPI 3 component schemas aligned with TypeScript models
 * (models/booking.ts, models/barber.ts, notificationInboxService, etc.).
 */
function sharedSchemas() {
  return {
    BookingStatus: {
      type: 'string',
      description:
        'Lifecycle state of a booking (models/booking.ts BookingStatus).',
      enum: [
        'pending_confirmation',
        'confirmed',
        'declined',
        'cancelled',
        'rescheduled',
        'completed',
        'no_show',
      ],
    },
    BarberApprovalStatus: {
      type: 'string',
      description: 'Barber moderation state (models/barber.ts BarberApprovalStatus).',
      enum: ['pending', 'approved', 'rejected', 'suspended'],
    },
    CancellationParty: {
      type: 'string',
      enum: ['client', 'barber'],
      description: 'Who initiated cancellation (models/booking.ts CancellationParty).',
    },
    UserRole: {
      type: 'string',
      enum: ['barber', 'client'],
    },
    ReportTargetType: {
      type: 'string',
      enum: ['barber', 'client', 'booking', 'review'],
    },
    BookingServiceLine: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        price: { type: 'number', description: 'Price in minor units (e.g. UZS)' },
      },
    },
    BookingContract: {
      type: 'object',
      description:
        'Snake_case booking payload returned by mobile-facing endpoints (models/booking.ts BookingContract).',
      properties: {
        id: { type: 'string' },
        status: { $ref: '#/components/schemas/BookingStatus' },
        timestamp: { type: 'string', format: 'date-time' },
        previous_timestamp: { type: 'string', nullable: true },
        cancellation_reason: { type: 'string', nullable: true },
        barber_id: { type: 'string' },
        client_id: { type: 'string' },
        services: {
          type: 'array',
          items: { $ref: '#/components/schemas/BookingServiceLine' },
        },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
    BookingCalendarRow: {
      type: 'object',
      description:
        'Summary row for barber/day calendar lists (BookingDetails in services).',
      properties: {
        bookingId: { type: 'string' },
        clientFirstName: { type: 'string' },
        clientLastName: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
            },
          },
        },
      },
    },
    ClientCreateBookingRequest: {
      type: 'object',
      required: ['barberId', 'serviceIds', 'timestamp'],
      properties: {
        barberId: { type: 'string' },
        serviceIds: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
    OkTrue: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
      },
    },
    CreateBookingResponseBody: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            booking: { $ref: '#/components/schemas/BookingContract' },
            services: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    ClientBookingsListResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/BookingCalendarRow' },
        },
      },
    },
    ClientBookingHistoryData: {
      type: 'object',
      description:
        'Full-client booking timeline (all barbers). Use GET /client/booking-history; GET /client/bookings stays per-barber.',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/BookingContract' },
        },
        next_cursor: {
          type: 'string',
          nullable: true,
          description:
            'Opaque cursor for the next page; pass as query param `cursor`.',
        },
      },
    },
    ClientBookingHistoryResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/ClientBookingHistoryData' },
      },
    },
    BarberBookingStatusPatch: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['confirmed', 'declined'],
        },
        reason: { type: 'string', nullable: true },
      },
    },
    RescheduleRequest: {
      type: 'object',
      required: ['timestamp'],
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        reason: { type: 'string', nullable: true },
      },
    },
    CancelBookingRequest: {
      type: 'object',
      properties: {
        reason: { type: 'string', nullable: true },
      },
    },
    ReviewCreateRequest: {
      type: 'object',
      required: ['rating'],
      properties: {
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: { type: 'string' },
        service_ids: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    ReviewSnippet: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        booking_id: { type: 'string' },
        barber_id: { type: 'string' },
        client_id: { type: 'string' },
        rating: { type: 'integer' },
        comment: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    BarberRatingAggregate: {
      type: 'object',
      properties: {
        average: { type: 'number' },
        count: { type: 'integer' },
      },
    },
    ReviewCreateResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            review: { $ref: '#/components/schemas/ReviewSnippet' },
            barber_rating: { $ref: '#/components/schemas/BarberRatingAggregate' },
          },
        },
      },
    },
    BookingMutationResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            booking: { $ref: '#/components/schemas/BookingContract' },
          },
        },
      },
    },
    NotificationInboxItem: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        read_at: { type: 'string', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
        metadata: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    NotificationListData: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/NotificationInboxItem' },
        },
        next_cursor: { type: 'string', nullable: true },
        unread_count: { type: 'integer' },
      },
    },
    NotificationListResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        data: { $ref: '#/components/schemas/NotificationListData' },
      },
    },
    CatalogService: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        default_duration_minutes: { type: 'integer' },
      },
    },
    CatalogResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: { $ref: '#/components/schemas/CatalogService' },
            },
          },
        },
      },
    },
    PublicReviewItem: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        booking_id: { type: 'string' },
        barber_id: { type: 'string' },
        client_id: { type: 'string' },
        rating: { type: 'integer' },
        comment: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    PublicReviewListData: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicReviewItem' },
        },
        next_cursor: { type: 'string', nullable: true },
      },
    },
    PublicReviewListResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        data: { $ref: '#/components/schemas/PublicReviewListData' },
      },
    },
    ReportCreateRequest: {
      type: 'object',
      required: ['target_type', 'target_id', 'reason'],
      properties: {
        target_type: { $ref: '#/components/schemas/ReportTargetType' },
        target_id: { type: 'string' },
        reason: { type: 'string' },
        description: { type: 'string' },
        attachments: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    BlockCreateRequest: {
      type: 'object',
      required: ['blocked_user_id'],
      properties: {
        blocked_user_id: { type: 'string' },
      },
    },
    BarberRegisterRequest: {
      type: 'object',
      required: [
        'username',
        'password',
        'firstName',
        'lastName',
        'phone',
        'location',
        'birthDate',
        'workingHours',
      ],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        password: { type: 'string', minLength: 6 },
        firstName: { type: 'string', maxLength: 50 },
        lastName: { type: 'string', maxLength: 50 },
        phone: { type: 'string' },
        location: { type: 'string', maxLength: 100 },
        birthDate: { type: 'string', format: 'date' },
        workingHours: { type: 'string', maxLength: 100 },
      },
    },
    BarberRegisterResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            barber: {
              type: 'object',
              additionalProperties: true,
              description:
                'Barber profile with approval_status, approval_message (snake_case); aligns with models/barber Barber minus password.',
            },
            services: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
    ReportCreateResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            report: {
              type: 'object',
              additionalProperties: true,
              description: 'Persisted report document',
            },
          },
        },
      },
    },
    EmptyDataEnvelope: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        data: { type: 'object' },
      },
    },
    TestNotificationRequest: {
      type: 'object',
      required: ['deviceToken'],
      properties: {
        deviceToken: { type: 'string', description: 'Expo push token' },
        title: { type: 'string' },
        body: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    TestNotificationResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        message: { type: 'string' },
        notification: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    TestLoggingResponse: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        environment: { type: 'string' },
      },
    },
    OpenApiSpecRoot: {
      type: 'object',
      description:
        'Full OpenAPI 3 document (same JSON as GET /docs.json). Schema is recursive; clients may treat as arbitrary JSON.',
      additionalProperties: true,
    },
    BarberResponse: {
      type: 'object',
      description:
        'Public barber profile (models/barber.ts BarberResponse; no password field).',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'object', additionalProperties: true },
        birthDate: { type: 'string' },
        workingHours: { type: 'string' },
        avatar: { type: 'string', nullable: true },
        images: { type: 'array', items: { type: 'string' } },
        services: { type: 'array', items: { type: 'object' } },
        approvalStatus: { $ref: '#/components/schemas/BarberApprovalStatus' },
        approvalMessage: { type: 'string', nullable: true },
        ratingAverage: { type: 'number', nullable: true },
        ratingCount: { type: 'integer', nullable: true },
      },
    },
    AdminBarberListResponse: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            barbers: {
              type: 'array',
              items: { $ref: '#/components/schemas/BarberResponse' },
            },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
          },
        },
      },
    },
    AdminApprovalPatchBody: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['approved', 'rejected', 'suspended'],
        },
        message: { type: 'string' },
      },
    },
    CmsBannerDoc: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        imageRef: { type: 'string' },
        active: { type: 'boolean' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    CmsBannerDocInput: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        imageRef: { type: 'string' },
        active: { type: 'boolean' },
      },
    },
    AdminStatsSummary: {
      type: 'object',
      properties: {
        barbersByApprovalStatus: {
          type: 'object',
          properties: {
            pending: { type: 'integer' },
            approved: { type: 'integer' },
            rejected: { type: 'integer' },
            suspended: { type: 'integer' },
            unknown: { type: 'integer' },
          },
        },
        bookingsLast7Days: { type: 'integer' },
        bookingsLast30Days: { type: 'integer' },
      },
    },
  };
}

module.exports = { sharedSchemas };
