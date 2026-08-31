# FlyRank Widget Platform — Verification Checklist & Evidence

This document provides a pre-filled compliance checklist and terminal outputs verifying each evaluation probe.

---

## 1. Compliance Checklist

| Item | Requirement | Status | Evidence Location |
|---|---|---|---|
| **P0.1** | Repository setup, Node.js + Express 5, Knex.js, `better-sqlite3` | **PASS** | `package.json`, `src/config/db.js` |
| **P0.2** | Secure JWT Secret (min 32 characters) | **PASS** | `.env`, `src/config/env.js` |
| **P1.1** | SQLite migrations (`users`, `widgets`, `submissions`) with CASCADE | **PASS** | `src/db/migrations/*` |
| **P1.2** | Seed data with bcrypt-hashed passwords & multi-tenant rows | **PASS** | `src/db/seeds/demo.js` |
| **P2.1** | Split CORS (Open for public endpoints, controlled for admin) | **PASS** | `src/config/middleware.js`, `src/config/routes.js` |
| **P2.2** | Preflight HTTP OPTIONS handling | **PASS** | `src/config/middleware.js` |
| **P2.3** | Global JSON parse error handling (400, never 500) | **PASS** | `src/config/middleware.js` |
| **P3.1** | Registration (bcrypt 10 rounds, UUID id, email uniqueness) | **PASS** | `src/modules/auth/auth.service.js` |
| **P3.2** | Login (JWT 7d expiry, generic credentials error) | **PASS** | `src/modules/auth/auth.service.js` |
| **P3.3** | Auth Middleware (Bearer header, tenant attachment to `req.user`) | **PASS** | `src/middleware/auth.middleware.js` |
| **P4.1** | Widget CRUD with strict tenant isolation (`user_id = ?`) | **PASS** | `src/modules/widgets/widgets.service.js` |
| **P4.2** | Embed snippet generator with version cache-busting (`&v=`) | **PASS** | `src/modules/widgets/widgets.service.js` |
| **P4.3** | Cross-tenant access forbidden (403 returned) | **PASS** | `src/modules/widgets/widgets.controller.js` |
| **P5.1** | Probe 1: Valid cross-origin submission from port 5500 | **PASS** | `test/probes.test.js` (Test 3) |
| **P5.2** | Probe 2: Malformed payload & JSON syntax error returns 400 | **PASS** | `test/probes.test.js` (Test 4) |
| **P5.3** | Probe 3: Rate limit burst returns 429 after 20 requests | **PASS** | `test/probes.test.js` (Test 9) |
| **P5.4** | Probe 4: Multi-provider geo fallback (3000ms timeout -> null) | **PASS** | `test/probes.test.js` (Test 5) |
| **P5.5** | Probe 5: Fire-and-forget side effect resilience | **PASS** | `test/probes.test.js` (Test 6) |
| **P5.6** | Probe 6: Honeypot trap (silent 200, row not inserted) | **PASS** | `test/probes.test.js` (Test 7) |
| **P6.1** | Dashboard stats & submissions filtered via `JOIN widgets` | **PASS** | `src/modules/dashboard/dashboard.controller.js` |
| **P6.2** | Dialect-portable date grouping (SQLite `strftime` & Postgres) | **PASS** | `src/modules/dashboard/dashboard.controller.js` |
| **P7.1** | Standalone `widget.js` runtime rendering form & styling | **PASS** | `public/widget.js` |
| **P8.1** | Second origin test page harness | **PASS** | `test-page/index.html` |

---

## 2. Automated Probe Execution Log

```
> npm test

--- STARTING PROBE & COMPLIANCE TEST SUITE ---

Test server running at http://127.0.0.1:57019
[TEST 1] Auth: Register and Login
✓ Auth tests passed

[TEST 2] Widgets & Tenant Isolation
✓ Widgets & tenant isolation passed

[TEST 3] Probe 1: Public Widget Config & Cross-Origin Submission
[SIDE EFFECT] New submission f6d90379-c602-4017-90f0-e26d87e77091 for widget aaaa2222-aaaa-4aaa-8aaa-aaaaaaaaaaaa
✓ Probe 1 (Cross-origin submission) passed

[TEST 4] Probe 2: Malformed Payload and Invalid JSON Syntax
✓ Probe 2 (Malformed payload & JSON syntax error) passed

[TEST 5] Probe 4: Geo Fallback Resilience
✓ Probe 4 (Geo fallback) passed

[TEST 6] Probe 5: Side Effect Resilience (Fire-and-Forget)
[SIDE EFFECT] New submission dummy for widget dummy
✓ Probe 5 (Side effect fire-and-forget) passed

[TEST 7] Probe 6: Honeypot Protection
✓ Probe 6 (Honeypot trap) passed

[TEST 8] Dashboard Analytics & Tenant Isolation
✓ Dashboard tenant-isolated analytics passed

[TEST 9] Probe 3: Rate Limit Burst (20 requests per IP limit)
✓ Probe 3 (Rate limiter burst) passed

========================================
ALL PROBES & TESTS PASSED SUCCESSFULLY! ✓
========================================
```

---

## 3. Manual Curl Commands for Each Probe

### Probe 1 — Valid Submission & Cross-Origin
```bash
curl -i -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5500" \
  -d '{
    "widget_id": "aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "data": { "email": "visitor@example.com", "name": "Jane Doe" },
    "honeypot": ""
  }'
```
*Expected*: `201 Created` with `{ "success": true, "id": "..." }` and `Access-Control-Allow-Origin: *`.

### Probe 2 — Malformed Payload & JSON Syntax Error
```bash
# Schema validation error
curl -i -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{"bad_field": true}'
# Expected: 400 Bad Request with { "error": "Validation failed" }

# Syntax error
curl -i -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{"widget_id": broken}'
# Expected: 400 Bad Request with { "error": "Invalid JSON" }
```

### Probe 3 — Rate Limit Burst
```bash
# Run 25 requests from same IP:
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/submissions \
    -H "Content-Type: application/json" \
    -d '{"widget_id":"aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa","data":{}}'
done
```
*Expected*: 20 responses return `201`/`400`, responses 21-25 return `429 Too Many Requests`.

### Probe 4 — Geo Fallback
```bash
# Submission from local loopback address or invalid IP
curl -i -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "x-mock-ip: 127.0.0.1" \
  -d '{
    "widget_id": "aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "data": { "email": "local@example.com" }
  }'
```
*Expected*: `201 Created` with stored record having `country: null`, `city: null`, `region: null`.

### Probe 5 — Side Effect Resilience
Submissions always return `201 Created` immediately even if internal side effects log errors. The execution flow is fire-and-forget.

### Probe 6 — Honeypot Bot Trap
```bash
curl -i -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "widget_id": "aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "data": { "email": "spambot@example.com" },
    "honeypot": "automated_spambot_field"
  }'
```
*Expected*: `200 OK` `{ "success": true, "message": "Submission received" }`. Database submission count remains unchanged.
