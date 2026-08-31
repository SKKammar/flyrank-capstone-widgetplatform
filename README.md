# FlyRank Widget Platform

A multi-tenant embeddable website widget platform built with Node.js, Express 5, Knex.js, SQLite (`better-sqlite3`), JWT, bcrypt, and Zod.

---

## Architecture & Request Paths

The platform supports three distinct, decoupled request paths:

```
+----------------------------------------------------------------------------------------------------+
|                                      FLYRANK PLATFORM ARCHITECTURE                                 |
+----------------------------------------------------------------------------------------------------+

  [PATH 1: Platform Owner / Tenant]
       │
       │  Authorization: Bearer <JWT>  (Restricted CORS: Origin whitelisted)
       ▼
   POST /api/auth/register, /api/auth/login
   GET/POST/PUT/DELETE /api/widgets
   GET /api/dashboard/submissions, /api/dashboard/stats
       │
       ▼
   +────────────────────────────+
   |     Admin API Routers      |
   +────────────────────────────+
       │
       ▼
   [Tenant Isolation Layer] ──> JOIN widgets w ON s.widget_id = w.id WHERE w.user_id = ?


  [PATH 2: Customer Third-Party Website (e.g. localhost:5500)]
       │
       │  <script src="http://localhost:3000/widget.js?id=<widget_id>&v=<version>"></script>
       ▼
   GET /widget.js (Open CORS, Cache-Control: public, max-age=300)
       │
       ▼
   [Client Browser executes widget.js]
       │
       │  Fetches JSON Schema: GET /api/submissions/config/:widgetId?v=<version>
       ▼
   [Dynamic Form Rendered in DOM with Hidden Honeypot Input]


  [PATH 3: Site Visitor Form Submission]
       │
       │  POST /api/submissions (Open CORS, Content-Type: application/json, 10kb limit)
       ▼
   +────────────────────────────+
   |   Layer 1: Honeypot Check  | ──(Bot filled honeypot)──> Return 200 OK (Silent Drop)
   +────────────────────────────+
       │ (Legitimate user)
   +────────────────────────────+
   |   Layer 2: Dual Rate Limit | ──(Exceeded 20/IP or 100/Widget)──> Return 429 Too Many Requests
   +────────────────────────────+
       │
   +────────────────────────────+
   |   Layer 3: Zod Validation  | ──(Malformed schema)──> Return 400 Bad Request
   +────────────────────────────+
       │
   +────────────────────────────+
   |   Layer 4: Widget Exists?  | ──(Missing/deleted)──> Return 404 Not Found
   +────────────────────────────+
       │
   +────────────────────────────+
   | Layer 5: Geo Enrichment    | ──> Provider A (ip-api.com, 3s) -> Provider B (ipapi.co, 3s) -> null
   +────────────────────────────+
       │
   +────────────────────────────+
   | Layer 6: DB Insert (Knex)  | ──> Stored in SQLite (dev.sqlite) / PostgreSQL (production)
   +────────────────────────────+
       │
       ├──> [Fire-and-Forget Side Effect] (Async notifications / webhooks, non-blocking, errors swallowed)
       │
       └──> Return 201 Created { success: true, id: <submission_id> }
```

---

## File Structure

```
flyrank-capstone-widgetplatform/
├── src/
│   ├── config/
│   │   ├── db.js                     # Knex database connection instance
│   │   ├── env.js                    # Validated environment variables (JWT strength check)
│   │   ├── middleware.js             # App-level CORS, preflight, & JSON error handling
│   │   └── routes.js                 # Modular route mounting and error handling
│   ├── db/
│   │   ├── migrations/               # Knex migrations (users, widgets, submissions)
│   │   └── seeds/
│   │       └── demo.js               # Multi-tenant demo seed data with bcrypt hashing
│   ├── modules/
│   │   ├── auth/                     # Register & Login with bcrypt + JWT
│   │   ├── widgets/                  # Tenant-isolated widget CRUD & embed generator
│   │   ├── submissions/              # Cross-origin submissions & config API
│   │   ├── enrichment/
│   │   │   └── geo.service.js        # Multi-provider geo enrichment with fallback
│   │   └── dashboard/                # Tenant-isolated analytics & stats
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT Bearer verification & tenant attachment
│   │   ├── rateLimit.middleware.js   # Dual rate limiters (per-IP and per-widget)
│   │   └── validate.middleware.js    # Zod schema validation
│   └── app.js                        # Express app orchestrator
├── public/
│   └── widget.js                     # Standalone client embed script
├── test-page/
│   └── index.html                    # Second-origin cross-origin test harness
├── test/
│   └── probes.test.js                # Automated test runner covering all 6 probes
├── knexfile.js                       # Knex SQLite & Postgres configuration
├── capstone.yaml                     # Evaluation specification
├── BUILDLOG.md                       # Session logs and reflections
├── EVIDENCE.md                       # Pre-filled checklist and probe verification
└── index.js                          # Server entry point
```

---

## Key Features & Security Design

1. **Strict Multi-Tenant Isolation**:
   - Every widget query checks both `id = ? AND user_id = ?`.
   - Every submission query joins through `widgets` to filter by `w.user_id = ?`. Direct submission queries without this join are strictly prohibited.
2. **CORS & Preflight OPTIONS**:
   - Public cross-origin endpoints (`/api/submissions`, `/widget.js`) accept requests from any origin.
   - Preflight HTTP `OPTIONS` requests are handled cleanly with 204 responses.
3. **Resilient Geo-Enrichment**:
   - Real client IP extraction from `x-forwarded-for`, `x-mock-ip`, and sockets.
   - Provider A (`ip-api.com`) with 3000ms timeout.
   - Provider B (`ipapi.co`) fallback with 3000ms timeout.
   - Graceful fallback to `null` if both fail. A submission is never rejected due to an upstream geo provider failure.
4. **Honeypot Bot Trap**:
   - The embed script injects a hidden honeypot input field (`honeypot`).
   - If a bot populates the field, the server silently returns `200 OK` ("Submission received") without inserting a record into the database.
5. **Dual Rate Limiting**:
   - Per-IP rate limiting: 20 requests per 15 minutes.
   - Per-Widget rate limiting: 100 requests per 15 minutes (keyed on `widget_id`).
6. **Fire-and-Forget Side Effects**:
   - Side effects (notifications, webhooks, emails) are dispatched asynchronously without awaiting.
   - Side effect failures are caught and swallowed, ensuring client responses are never delayed or degraded.
7. **Malformed Payload & JSON Syntax Protection**:
   - Express entity parse failures return `400 Bad Request` with `{ "error": "Invalid JSON" }` instead of an uncaught 500 error.
   - Zod schema validation errors return `400 Bad Request` with structured details.
8. **Widget Versioning & Cache Busting**:
   - Each widget tracks an incrementing `version` integer.
   - Embed snippets automatically append `&v=${version}` to the script URL (`/widget.js?id=...&v=2`).
   - The script forwards `?v=${version}` to the configuration endpoint (`/api/submissions/config/:widgetId?v=2`), busting browser HTTP caches when widgets are updated.

---

## Migration Gotchas: SQLite vs PostgreSQL

When transitioning from SQLite development to PostgreSQL production:

1. **Date Grouping in Dashboard Stats**:
   - **SQLite**: `strftime('%Y-%m-%d', s.created_at)`
   - **PostgreSQL**: `to_char(s.created_at, 'YYYY-MM-DD')` (or `DATE_TRUNC('day', s.created_at)`)
   - *Status in this codebase*: The dashboard controller automatically detects the Knex dialect (`db.client.config.client === 'pg'`) and switches expressions dynamically.
2. **Boolean Columns**:
   - SQLite stores booleans as `0` or `1`, whereas PostgreSQL uses native `boolean` (`true`/`false`).
3. **JSON Fields**:
   - Knex handles JSON columns transparently, but PostgreSQL uses native `jsonb` indexing while SQLite stores stringified JSON. The codebase safely parses both string and object forms.

---

## Quickstart

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Generate a secure 32+ character JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Create `.env` (or copy `.env.example`):
```env
PORT=3000
JWT_SECRET=<generated_64_hex_secret>
DB_FILENAME=./dev.sqlite
NODE_ENV=development
```

### 3. Run Migrations & Seed Data
```bash
npm run migrate
npm run seed
```

### 4. Start the Platform
```bash
# Production start
npm start

# Development mode with hot-reload
npm run dev
```

### 5. Run Verification Probes
```bash
npm test
```

---

## Seed Credentials & Demo Data

The seed script creates two isolated tenant accounts:

| User | Email | Password | Widgets Owned | Total Submissions |
|---|---|---|---|---|
| User A | `user_a@example.com` | `Password123!` | 2 (`aaaa1111-...`, `aaaa2222-...`) | 4 |
| User B | `user_b@example.com` | `Password123!` | 1 (`bbbb1111-...`) | 1 |

---

## Embed Snippet Usage

To embed a widget on an external website:
```html
<script src="http://localhost:3000/widget.js?id=aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa&v=1"></script>
```

Testing locally on a second origin:
```bash
# Terminal 1: Start API server
npm start

# Terminal 2: Serve test page on another port (e.g. 5500)
npx serve test-page -p 5500
```
Visit `http://localhost:5500` in the browser to interact with the rendered form.
