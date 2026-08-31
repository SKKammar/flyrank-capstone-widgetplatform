# FlyRank Widget Platform — Build Log

## Phase 0: Project Setup & Dependencies
- Initialized git repository.
- Created `package.json` with scripts: `start`, `dev`, `migrate`, `seed`, `test`.
- Installed dependencies: `express`, `knex`, `better-sqlite3`, `jsonwebtoken`, `bcrypt`, `zod`, `cors`, `express-rate-limit`, `uuid`, `dotenv`.
- Installed dev dependency: `nodemon`.
- Created `.gitignore`, `.env`, and `.env.example`.

## Phase 1: Database Setup & Migrations
- Configured `knexfile.js` with SQLite (`better-sqlite3`) and `useNullAsDefault: true`.
- Created database connection in `src/config/db.js`.
- Created Knex migrations:
  1. `create_users`: UUID primary key, unique email, password hash, created_at timestamp.
  2. `create_widgets`: UUID primary key, foreign key `user_id` referencing `users(id)` with CASCADE delete, JSON fields & display options, version counter, timestamps, index on `user_id`.
  3. `create_submissions`: UUID primary key, foreign key `widget_id` referencing `widgets(id)` with CASCADE delete, JSON submission data, geo fields (`country`, `city`, `region`), IP address, honeypot trigger boolean, created_at timestamp, indexes on `widget_id` and `created_at`.
- Executed migrations via `npx knex migrate:latest` (Batch 1: 3 migrations run successfully).

## Phase 2: Core Express App & Infrastructure
- Created `src/app.js` with structured routing and CORS separation:
  - Public submission endpoint (`/api/submissions`) with open CORS and 10kb request limit.
  - Public `/widget.js` script endpoint with `Cache-Control: public, max-age=300`.
  - Admin endpoints (`/api/auth`, `/api/widgets`, `/api/dashboard`) with restricted/controlled CORS.
  - Dedicated preflight OPTIONS handler.
  - Global JSON entity parse error handler converting syntax errors to `400 Bad Request` `{ "error": "Invalid JSON" }` rather than unhandled 500 errors.
- Created root `index.js` server bootstrap listening on `PORT=3000`.

## Phase 3: Auth Module & Tenant Middleware
- Built `src/modules/auth/auth.service.js`:
  - `register`: Hashes password with bcrypt (10 rounds), generates UUID id, rejects duplicate emails with `Email already in use`.
  - `login`: Compares passwords with bcrypt, signs JWT with `{ userId }` payload expiring in 7 days, returns generic `Invalid credentials` error on mismatch.
- Built `src/modules/auth/auth.controller.js` and `auth.routes.js`.
- Built `src/middleware/auth.middleware.js`: Extracts `Bearer` token from `Authorization` header, verifies JWT, attaches `req.user = { userId }`, returns `401 Unauthorized` directly on verification failure.

## Phase 4: Widgets Module
- Built `src/modules/widgets/widgets.schema.js`: Zod schema for widget creation and updates.
- Built `src/modules/widgets/widgets.service.js`:
  - Enforces tenant isolation on all queries (`user_id = ?`).
  - Automatic JSON serialization/deserialization for SQLite.
  - `generateEmbedSnippet`: Returns HTML script snippet for customer websites.
- Built `src/modules/widgets/widgets.controller.js` and `widgets.routes.js`:
  - CRUD operations returning 200, 201, 204, 403 (cross-tenant), and 404.
  - Embed snippet endpoint (`GET /api/widgets/:id/embed`).
- Built `src/modules/widgets/widget-script.handler.js`: Serves `widget.js` with client-side bootstrap and caching headers.

## Phase 5: Submissions Module, Resilient Geo-Enrichment & Rate Limiting
- Built `src/modules/enrichment/geo.service.js`:
  - Provider A (`ip-api.com`) with 3000ms timeout.
  - Provider B (`ipapi.co`) fallback with 3000ms timeout.
  - Graceful fallback returning `null` if both fail.
  - Detection of private/loopback IP addresses.
- Built `src/modules/submissions/submissions.schema.js`: Validates `widget_id` (UUID), `data` (max 20 fields), and `honeypot` (max length 0).
- Built `src/modules/submissions/submissions.service.js`:
  - Explicit widget existence check: rejects missing or invalid widgets with `404 Widget not found`.
  - Non-blocking fire-and-forget side effect execution (`triggerSideEffect`) with swallowed errors.
- Built `src/modules/submissions/submissions.controller.js`:
  - Honeypot check: If bot populates honeypot, returns `200 OK` silent success and drops the record.
  - IP extraction from `x-forwarded-for`, `x-mock-ip`, and socket address.
  - Public `GET /api/submissions/config/:widgetId` endpoint for embedding.
- Built `src/middleware/rateLimit.middleware.js`:
  - Per-IP rate limiter (20 per 15 min).
  - Per-Widget rate limiter (100 per 15 min).

## Phase 6: Dashboard Module (Tenant Analytics)
- Built `src/modules/dashboard/dashboard.controller.js` and `dashboard.routes.js`:
  - `GET /api/dashboard/submissions`: Paginated list of submissions joining through `widgets` to enforce `w.user_id = req.user.userId`.
  - `GET /api/dashboard/stats`: Analytics aggregation (total submissions, submissions per widget, submissions by country, 7-day timeline).

## Phase 7 & 8: Embeddable Widget Script & Test Page
- Built `public/widget.js`:
  - Extracts widget ID from script `src` query parameters.
  - Fetches widget schema from `/api/submissions/config/:widgetId`.
  - Dynamically renders responsive UI with isolated CSS styles.
  - Injects hidden honeypot field.
  - Submits cross-origin `POST /api/submissions` with UI status feedback.
- Built `test-page/index.html`:
  - Standalone web page simulating an external client website.

## Phase 9 & 10: Seed Data & Verification
- Created `src/db/seeds/demo.js`:
  - Populates User A (`user_a@example.com`) and User B (`user_b@example.com`).
  - 2 widgets for User A, 1 widget for User B.
  - Sample submissions for both tenants.
- Built `test/probes.test.js` automated test suite:
  - Verified Probes 1 through 6.
  - Verified cross-tenant isolation and 403 Forbidden enforcement.
  - Verified dual rate limiting.
  - Verified JSON syntax error handler.
