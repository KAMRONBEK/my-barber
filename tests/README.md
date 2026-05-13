# API tests

Integration tests run against [`createApp()`](../appFactory.ts) with Supertest. Firebase Admin and config are replaced in [`jest.setup.ts`](../jest.setup.ts) by manual mocks so tests do not connect to GCP.

## Test layout

- [`tests/integration/`](./integration) – Supertest-driven HTTP tests that exercise the real Express stack.
- [`tests/unit/`](./unit) – focused unit tests for middleware, utilities, and service classes (including `serviceCatchPaths.test.ts`, which forces every service `try/catch` arm to fire by spying on the firestore client).
- [`tests/support/`](./support) – `mockFirestore.ts` (in-memory Firestore), `authHelpers.ts` (signed JWTs).

## Coverage policy

`npm test -- --coverage` measures **lines/branches/functions executed** across `collectCoverageFrom` in [`jest.config.cjs`](../jest.config.cjs).

The following files are intentionally excluded from coverage because they wrap external SDKs that we do not own and that would require live infra (or extensive mocking with little value) to exercise:

- [`server.ts`](../server.ts) — `app.listen`, real env validation, GCP bootstrap.
- [`routes/test.ts`](../routes/test.ts), [`routes/openapi-mobile-contracts.ts`](../routes/openapi-mobile-contracts.ts) — debug / generated.
- [`middleware/upload.ts`](../middleware/upload.ts) — `multer` glue.
- [`services/imageCompressionService.ts`](../services/imageCompressionService.ts) — `sharp`.
- [`services/fileStorage.ts`](../services/fileStorage.ts) — Firebase Storage SDK.
- [`services/notificationService.ts`](../services/notificationService.ts) — Expo push SDK.
- [`config/config.ts`](../config/config.ts), [`config/database.ts`](../config/database.ts) — replaced by `__mocks__` at test time.
- [`models/**`](../models/) — type-only declarations.

### Thresholds (CI fails below these)

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 85%       |
| Branches   | 75%       |
| Functions  | 80%       |
| Lines      | 85%       |

Current coverage sits comfortably above each threshold (see the latest CI run). When adding new code, keep the global numbers above this floor; adding tests for new endpoints is required by [`api-swagger-and-tests`](../.cursor/rules/api-swagger-and-tests.mdc).

## Commands

- Run all tests: `npm test`
- Coverage report: `npm test -- --coverage`
- Run a single suite: `npm test -- tests/integration/auth.test.ts`
