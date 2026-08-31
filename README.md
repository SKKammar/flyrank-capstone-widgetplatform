# FlyRank Widget Platform

A multi-tenant embeddable website widget platform built with Node.js, Express, Knex.js, SQLite (`better-sqlite3`), JWT, bcrypt, and Zod.

---

## Architecture Overview

```
flyrank-capstone-widgetplatform/
├── src/
│   ├── config/
│   │   ├── db.js                     # Knex database instance
│   │   └── env.js                    # Environment configuration
│   ├── db/
│   │   ├── migrations/               # Knex migrations (users, widgets, submissions)
│   │   └── seeds/
│   │       └── demo.js               # Multi-tenant demo seed data
│   ├── modules/
│   │   ├── auth/                     # Register & Login with bcrypt + JWT
│   │   ├── widgets/                  # Tenant-isolated widget CRUD & embed script
│   │   ├── submissions/              # Cross-origin submissions & config API
│   │   ├── enrichment/
│   │   │   └── geo.service.js        # Multi-provider geo enrichment with fallback
│   │   └── dashboard/                # Tenant-isolated analytics & stats
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT Bearer verification (tenant attachment)
│   │   ├── rateLimit.middleware.js   # Dual rate limiters (per-IP and per-widget)
│   │   └── validate.middleware.js    # Zod schema validation
│   └── app.js                        # Express application & CORS / error handlers
├── public/
│   └── widget.js                     # Standalone client embed script
├── test-page/
│   └── index.html                    # Second-origin cross-origin test harness
├── test/
│   └── probes.test.js                # Automated test runner covering all 6 probes
├── knexfile.js                       # Knex SQLite & Postgres configuration
├── capstone.yaml                     # Evaluation specification
├── BUILDLOG.md                       # Phase-by-phase build logs
├── EVIDENCE.md                       # Verification probe outputs and proof
└── index.js                          # Server bootstrapper
```

---

## Key Features & Security Design

1. **Strict Multi-Tenant Isolation**:
   - Every widget query checks both `id = ? AND user_id = ?`.
   - Every submission query joins through `widgets` to filter by `w.user_id = ?`. Direct submission queries without this join are strictly prohibited.
2. **CORS & OPTIONS Preflight**:
   - Public cross-origin endpoints (`/api/submissions`, `/widget.js`) are open to any origin.
   - Admin routes (`/api/auth`, `/api/widgets`, `/api/dashboard`) require authentication and restrict origin in production.
   - Preflight HTTP `OPTIONS` requests are handled cleanly.
3. **Resilient Geo-Enrichment**:
   - Submissions extract real client IPs from `x-forwarded-for` and sockets.
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
Create `.env` (or copy `.env.example`):
```env
PORT=3000
JWT_SECRET=your_super_secret_key_change_this
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
<script src="http://localhost:3000/widget.js?id=aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa"></script>
```

Testing locally on a second origin:
```bash
# Terminal 1: Start API server
npm start

# Terminal 2: Serve test page on another port (e.g. 5500)
npx serve test-page -p 5500
```
Visit `http://localhost:5500` in the browser to interact with the rendered form.
