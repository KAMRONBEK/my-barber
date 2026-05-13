/**
 * OpenAPI documentation only (handlers live in barber.ts, client.ts, notifications.ts, public.ts, trust.ts).
 * Scanned by scripts/generate-swagger.js via ./routes/*.ts
 */

/**
 * @swagger
 * /barber/bookings/{bookingId}/status:
 *   patch:
 *     tags: [Barber]
 *     summary: Confirm or decline a pending booking (barber)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BarberBookingStatusPatch'
 *     responses:
 *       200:
 *         description: Updated booking (snake_case body under data.booking)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingMutationResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (wrong role or barber not approved)
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Invalid state for this transition
 */

/**
 * @swagger
 * /barber/bookings/{bookingId}/cancel:
 *   post:
 *     tags: [Barber]
 *     summary: Cancel booking (barber)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelBookingRequest'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingMutationResponse'
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /barber/bookings/{bookingId}/reschedule:
 *   post:
 *     tags: [Barber]
 *     summary: Reschedule booking (barber)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RescheduleRequest'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingMutationResponse'
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /barber/bookings/{bookingId}/no-show:
 *   post:
 *     tags: [Barber]
 *     summary: Mark booking as no-show
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingMutationResponse'
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /barber/bookings/{bookingId}/complete:
 *   post:
 *     tags: [Barber]
 *     summary: Mark booking completed (earnings / reviews gate)
 *     description: Sets status completed, completedAt, and service total for earnings.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingMutationResponse'
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /barber/earnings:
 *   get:
 *     tags: [Barber]
 *     summary: Earnings summary for date range (UZS)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{4}-\\d{2}-\\d{2}$'
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{4}-\\d{2}-\\d{2}$'
 *     responses:
 *       200:
 *         description: summary, daily, bookings
 *       400:
 *         description: Validation
 */

/**
 * @swagger
 * /barber/services:
 *   get:
 *     tags: [Barber]
 *     summary: List barber line items (catalog-linked)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   put:
 *     tags: [Barber]
 *     summary: Upsert barber services by catalog_service_id
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [services]
 *             properties:
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     [catalog_service_id, name, price, duration_minutes, is_active]
 *                   properties:
 *                     catalog_service_id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     duration_minutes:
 *                       type: integer
 *                     is_active:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /barber/services/{serviceId}:
 *   delete:
 *     tags: [Barber]
 *     summary: Soft-delete a barber service (is_active false)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns updated services list
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /client/bookings/{bookingId}/cancel:
 *   post:
 *     tags: [Client]
 *     summary: Cancel booking (client)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelBookingRequest'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingMutationResponse'
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /client/bookings/{bookingId}/reschedule:
 *   post:
 *     tags: [Client]
 *     summary: Reschedule booking (client)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RescheduleRequest'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingMutationResponse'
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /client/bookings/{bookingId}/review:
 *   post:
 *     tags: [Client]
 *     summary: Create review after completed booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewCreateRequest'
 *     responses:
 *       201:
 *         description: Review created; barber_rating aggregates returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewCreateResponse'
 *       409:
 *         description: Not completed or duplicate review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Paginated notification inbox
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated inbox
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark one notification read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 */

/**
 * @swagger
 * /services/catalog:
 *   get:
 *     tags: [Public]
 *     summary: Global service catalog seed list
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CatalogResponse'
 */

/**
 * @swagger
 * /barbers/{barberId}/reviews:
 *   get:
 *     tags: [Public]
 *     summary: Public paginated reviews for a barber
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicReviewListResponse'
 */

/**
 * @swagger
 * /reports:
 *   post:
 *     tags: [Trust]
 *     summary: Submit abuse/safety report
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportCreateRequest'
 *     responses:
 *       201:
 *         description: Report created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportCreateResponse'
 */

/**
 * @swagger
 * /blocks:
 *   post:
 *     tags: [Trust]
 *     summary: Block another user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockCreateRequest'
 *     responses:
 *       201:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyDataEnvelope'
 *       400:
 *         description: Invalid block
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /blocks/{userId}:
 *   delete:
 *     tags: [Trust]
 *     summary: Unblock user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyDataEnvelope'
 *       404:
 *         description: Block not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export {};
