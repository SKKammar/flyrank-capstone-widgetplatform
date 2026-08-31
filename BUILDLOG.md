# FlyRank Widget Platform — Build Log

## Session 1 — August 31, 2026

### What I built
- **Core Architecture & Setup**: Initialized Node.js + Express 5 application with Knex.js, SQLite (`better-sqlite3`), bcrypt, jsonwebtoken, zod, cors, and express-rate-limit.
- **Database Migrations & Seeds**:
  - `create_users`: UUID PK, unique email, bcrypt password hash.
  - `create_widgets`: UUID PK, foreign key to users with CASCADE delete, JSON fields and display settings, version counter, user_id index.
  - `create_submissions`: UUID PK, foreign key to widgets with CASCADE delete, JSON data, geo-enrichment columns (`country`, `city`, `region`), IP address, honeypot trigger boolean, widget_id and created_at indexes.
  - `demo.js`: Seed data with User A (2 widgets, 4 submissions) and User B (1 widget, 1 submission) using real bcrypt password hashing at seed time.
- **Authentication & Tenant Isolation**:
  - Registration & Login with 10 bcrypt salt rounds and 7-day signed JWT tokens.
  - Strict tenant isolation: every widget query verifies `id = ? AND user_id = ?`, every submission query joins through `widgets` on `w.user_id = ?`.
- **Public Widget Runtime**:
  - `public/widget.js`: Standalone client script extracting its own script tag URL parameter `?id=...&v=...`, fetching schema from `/api/submissions/config/:widgetId`, rendering a responsive form card into the DOM, and submitting cross-origin.
  - Added cache-busting: increments `version` and automatically appends `&v=${version}` to embed snippets and config requests.
- **Resilient Ingestion Pipeline**:
  - Client IP extraction supporting `x-forwarded-for`, `x-mock-ip`, and socket address.
  - Multi-provider fallback geo-enrichment (`ip-api.com` -> `ipapi.co` -> null) with 3000ms timeout per provider.
  - Honeypot protection returning silent `200 OK` without database write.
  - Dual rate limiting: 20/15m per IP and 100/15m per widget.
  - Fire-and-forget side effect execution.
  - JSON parse error handler catching syntax errors and returning `400 Bad Request` `{ "error": "Invalid JSON" }` instead of uncaught 500s.
- **Dashboard Module**: Paginated submissions and dialect-portable analytics (supporting SQLite and PostgreSQL date grouping).
- **Automated Test Suite**: Verified Probes 1 through 6 in `test/probes.test.js`.

---

### Where AI helped
1. **Rapid Scaffolding**: Fast generation of initial Knex migrations, schema definitions, and REST controllers.
2. **Resilient Network Timeouts**: Clean `AbortController` implementation for multi-provider geo-enrichment with 3000ms timeouts.
3. **Automated Probe Verification**: Built a complete test runner in `test/probes.test.js` to simulate cross-origin submissions, rate limiting bursts, and honeypot traps without external services.

---

### Where AI was wrong / what I changed
1. **Express 5 Wildcard Routing**:
   - *Issue*: Initially added `app.options('*', cors())`. In Express 5 / `path-to-regexp` v8, un-named wildcard `*` throws a `PathError [TypeError]: Missing parameter name at index 1: *`.
   - *Fix*: Replaced with an Express 5 compatible OPTIONS preflight middleware handler setting standard CORS headers and returning 204.
2. **UUID Format Strictness in Zod**:
   - *Issue*: Dummy seed IDs like `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` were rejected by `z.string().uuid()` because RFC 4122 requires specific version nibbles (1-5) and variant nibbles (8, 9, a, b).
   - *Fix*: Updated the seed file and test fixtures to use valid RFC 4122 UUID v4 values (e.g. `aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa`), ensuring zero validation rejections.
3. **Database Date Grouping Portability**:
   - *Issue*: Raw SQLite `date()` or `strftime()` breaks when deploying or migrating to PostgreSQL.
   - *Fix*: Made the dashboard date grouping query dialect-portable using Knex client detection (`to_char(s.created_at, 'YYYY-MM-DD')` for Postgres vs `strftime('%Y-%m-%d', s.created_at)` for SQLite).
4. **Architectural Modularization**:
   - *Issue*: `app.js` was becoming a monolithic file mixing CORS configurations, body parsing, error handling, and route definitions.
   - *Fix*: Refactored into `src/config/middleware.js` (app-level middleware & error handling), `src/config/routes.js` (route mounting), and a clean `src/app.js` orchestrator.
5. **Cryptographic JWT Secret Generation**:
   - *Issue*: Static placeholder string in `.env`.
   - *Fix*: Replaced with a cryptographically secure 256-bit random key (64 hex characters) generated via `crypto.randomBytes(32)` and added length validation in `src/config/env.js`.

---

### What I learned
1. **Tenant Isolation must be enforced at the SQL JOIN layer**: Filtering submissions directly by `widget_id` is insecure because widgets belong to users. Every query on `submissions` MUST join through `widgets` on `w.user_id = req.user.userId`.
2. **Cross-Origin Embeds require strict separation of concerns**: The public script and submission endpoint must have completely separate CORS and rate limiting boundaries from the admin dashboard API.
3. **Graceful Degradation is non-negotiable for ingest APIs**: Upstream geo-IP lookups and webhook/email side effects must never block or fail the primary user submission flow.
