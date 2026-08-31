# FlyRank Widget Platform — Verification & Probe Evidence

This document provides concrete execution logs, probe verifications, and architectural proof for the FlyRank Widget Platform.

---

## 1. Automated Test Suite Execution Output

```
> flyrank-capstone-widgetplatform@1.0.0 test
> node test/probes.test.js

--- STARTING PROBE & COMPLIANCE TEST SUITE ---

Test server running at http://127.0.0.1:53484
[TEST 1] Auth: Register and Login
✓ Auth tests passed

[TEST 2] Widgets & Tenant Isolation
✓ Widgets & tenant isolation passed

[TEST 3] Probe 1: Public Widget Config & Cross-Origin Submission
[SIDE EFFECT] New submission 95987b8b-d4e2-4d43-9d5a-21a74b79b363 for widget aaaa2222-aaaa-4aaa-8aaa-aaaaaaaaaaaa
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

## 2. Probe-by-Probe Details

### Probe 1: Valid Cross-Origin Submission
- **Request**: `POST /api/submissions` from Origin `http://localhost:5500`.
- **Payload**:
  ```json
  {
    "widget_id": "aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "data": { "email": "cross-origin-user@example.com", "name": "Test Visitor" },
    "honeypot": ""
  }
  ```
- **Response**: `201 Created` with `{ "success": true, "id": "..." }`.
- **Headers Verified**: `Access-Control-Allow-Origin: *` returned, allowing third-party origin embedding.
- **Verification**: Submission is immediately visible in User A's dashboard (`GET /api/dashboard/submissions`).

### Probe 2: Malformed Payload & JSON Syntax Protection
- **Case A (Invalid Zod Schema)**:
  ```bash
  curl -X POST http://localhost:3000/api/submissions \
    -H "Content-Type: application/json" \
    -d '{"bad_field": true}'
  ```
  - **Result**: `400 Bad Request` `{ "error": "Validation failed", "details": [...] }`
- **Case B (Malformed JSON Syntax)**:
  ```bash
  curl -X POST http://localhost:3000/api/submissions \
    -H "Content-Type: application/json" \
    -d '{"widget_id": "test", broken_json}'
  ```
  - **Result**: `400 Bad Request` `{ "error": "Invalid JSON" }` (never an unhandled 500 error).

### Probe 3: Rate Limiting Burst
- **Behavior**: Per-IP limiter configured to 20 submissions per 15-minute window.
- **Execution**: 25 rapid submissions sent with consistent client IP.
- **Result**: Submissions 1 through 20 succeed (or validate); submission 21 triggers `429 Too Many Requests` with:
  ```json
  { "error": "Too many requests, please try again later" }
  ```

### Probe 4: Geo-Enrichment Fallback
- **Primary Provider**: `http://ip-api.com/json/${ip}` (3000ms timeout).
- **Secondary Provider**: `https://ipapi.co/${ip}/json/` (3000ms timeout).
- **Fallback Result**: When testing local IPs (`127.0.0.1`, `::1`) or unreachable upstream providers, `getGeoData` returns `null` cleanly without throwing. The submission proceeds and is stored with nullable geo columns.

### Probe 5: Fire-and-Forget Side Effect Failure
- **Implementation**:
  ```js
  // triggerSideEffect is dispatched without awaiting
  triggerSideEffect(formatted);
  ```
- **Error Handling**: `triggerSideEffect` contains an internal `try/catch` block that logs failures and swallows the exception. Upstream API response remains `201 Created`.

### Probe 6: Honeypot Protection
- **Attack Payload**:
  ```json
  {
    "widget_id": "aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "data": { "email": "bot@spam.com" },
    "honeypot": "automated bot payload"
  }
  ```
- **Behavior**:
  - Response: `200 OK` `{ "success": true, "message": "Submission received" }`.
  - Database Check: Count of submissions in SQLite before and after matches exactly. No row was inserted. Bot is deceived into believing the submission succeeded.

---

## 3. Tenant Isolation Verification

1. **User Separation**:
   - User A: `user_a@example.com` owns widgets `aaaa1111-...` and `aaaa2222-...`.
   - User B: `user_b@example.com` owns widget `bbbb1111-...`.
2. **Cross-Tenant Access Attempt**:
   - User B sends `GET /api/widgets/aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa` with User B's JWT token.
   - Result: `403 Forbidden` (`{ "error": "Forbidden: Widget belongs to another user" }`).
3. **Database Query Level**:
   - Every dashboard query executes:
     ```sql
     SELECT s.* FROM submissions s
     JOIN widgets w ON s.widget_id = w.id
     WHERE w.user_id = ?
     ```
   - User A stats report 4 submissions; User B stats report 1 submission.
