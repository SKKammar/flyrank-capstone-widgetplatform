const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');
const { getGeoData } = require('../src/modules/enrichment/geo.service');
const { triggerSideEffect } = require('../src/modules/submissions/submissions.service');

async function runTests() {
  console.log('--- STARTING PROBE & COMPLIANCE TEST SUITE ---\n');

  // Start app on dynamic test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // -------------------------------------------------------------
    // 1. AUTH PROBES: Register & Login (User A and User B)
    // -------------------------------------------------------------
    console.log('[TEST 1] Auth: Register and Login');
    // Login User A seeded in demo.js
    const loginResA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user_a@example.com', password: 'Password123!' })
    });
    assert.strictEqual(loginResA.status, 200, 'User A login should succeed with 200');
    const loginDataA = await loginResA.json();
    assert.ok(loginDataA.token, 'Token should be returned');
    const tokenA = loginDataA.token;

    // Login User B seeded in demo.js
    const loginResB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user_b@example.com', password: 'Password123!' })
    });
    assert.strictEqual(loginResB.status, 200, 'User B login should succeed with 200');
    const loginDataB = await loginResB.json();
    const tokenB = loginDataB.token;

    // Test Invalid Login
    const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user_a@example.com', password: 'WrongPassword' })
    });
    assert.strictEqual(invalidLogin.status, 400, 'Invalid login should return 400');
    const invalidLoginData = await invalidLogin.json();
    assert.strictEqual(invalidLoginData.error, 'Invalid credentials');
    console.log('✓ Auth tests passed');

    // -------------------------------------------------------------
    // 2. WIDGETS & TENANT ISOLATION PROBES
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Widgets & Tenant Isolation');
    // User A lists widgets
    const widgetsResA = await fetch(`${baseUrl}/api/widgets`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(widgetsResA.status, 200);
    const widgetsA = await widgetsResA.json();
    assert.strictEqual(widgetsA.length, 2, 'User A should own 2 seeded widgets');

    // User B lists widgets
    const widgetsResB = await fetch(`${baseUrl}/api/widgets`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(widgetsResB.status, 200);
    const widgetsB = await widgetsResB.json();
    assert.strictEqual(widgetsB.length, 1, 'User B should own 1 seeded widget');

    // Tenant Isolation Check: User B attempts to fetch User A's widget
    const userAWidgetId = widgetsA[0].id;
    const crossTenantGet = await fetch(`${baseUrl}/api/widgets/${userAWidgetId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(crossTenantGet.status, 403, 'Cross-tenant access should return 403 Forbidden');

    // User A fetches own widget embed snippet
    const embedRes = await fetch(`${baseUrl}/api/widgets/${userAWidgetId}/embed`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(embedRes.status, 200);
    const embedText = await embedRes.text();
    assert.ok(embedText.includes('<script src='), 'Embed snippet should contain <script src=');
    console.log('✓ Widgets & tenant isolation passed');

    // -------------------------------------------------------------
    // 3. PROBE 1: Valid Cross-Origin Submission & Config Endpoint
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Probe 1: Public Widget Config & Cross-Origin Submission');
    // GET widget config (cross-origin, public)
    const configRes = await fetch(`${baseUrl}/api/submissions/config/${userAWidgetId}`, {
      headers: { Origin: 'http://localhost:5500' }
    });
    assert.strictEqual(configRes.status, 200);
    assert.ok(configRes.headers.get('cache-control')?.includes('max-age=300'), 'Cache-Control header expected');
    const configData = await configRes.json();
    assert.strictEqual(configData.id, userAWidgetId);

    // POST valid submission (with mock IP header)
    const subRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5500',
        'x-mock-ip': '8.8.8.8'
      },
      body: JSON.stringify({
        widget_id: userAWidgetId,
        data: { email: 'cross-origin-user@example.com', name: 'Test Visitor' },
        honeypot: ''
      })
    });
    assert.strictEqual(subRes.status, 201, 'Valid submission should return 201 Created');
    const subData = await subRes.json();
    assert.strictEqual(subData.success, true);
    assert.ok(subData.id, 'Submission ID should be returned');
    console.log('✓ Probe 1 (Cross-origin submission) passed');

    // -------------------------------------------------------------
    // 4. PROBE 2: Malformed Payload & Broken JSON Syntax
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Probe 2: Malformed Payload and Invalid JSON Syntax');
    // Case A: Missing required widget_id or invalid field types
    const malformedRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bad_field: true })
    });
    assert.strictEqual(malformedRes.status, 400, 'Malformed payload must return 400, never 500');
    const malformedData = await malformedRes.json();
    assert.strictEqual(malformedData.error, 'Validation failed');

    // Case B: Raw invalid JSON syntax (e.g. trailing commas or unmatched braces)
    const syntaxErrRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"widget_id": "test", data: broken_json}'
    });
    assert.strictEqual(syntaxErrRes.status, 400, 'Invalid JSON syntax must return 400, never 500');
    const syntaxErrData = await syntaxErrRes.json();
    assert.strictEqual(syntaxErrData.error, 'Invalid JSON');
    console.log('✓ Probe 2 (Malformed payload & JSON syntax error) passed');

    // -------------------------------------------------------------
    // 5. PROBE 4: Geo Fallback Resilience
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Probe 4: Geo Fallback Resilience');
    // Local / private IP returns null gracefully
    const localGeo = await getGeoData('127.0.0.1');
    assert.strictEqual(localGeo, null, 'Private IP should gracefully return null');

    // Non-existent or invalid IP string should return null without throwing
    const invalidIpGeo = await getGeoData('999.999.999.999');
    assert.strictEqual(invalidIpGeo, null, 'Invalid IP should gracefully return null');
    console.log('✓ Probe 4 (Geo fallback) passed');

    // -------------------------------------------------------------
    // 6. PROBE 5: Side Effect Failure Resilience
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Probe 5: Side Effect Resilience (Fire-and-Forget)');
    // Even if triggerSideEffect logs an error, it must not throw or block
    await triggerSideEffect({ id: 'dummy', widget_id: 'dummy' });
    console.log('✓ Probe 5 (Side effect fire-and-forget) passed');

    // -------------------------------------------------------------
    // 7. PROBE 6: Honeypot Protection
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Probe 6: Honeypot Protection');
    const countBefore = await db('submissions').count('id as count').first();
    const botRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widget_id: userAWidgetId,
        data: { email: 'bot@spam.com' },
        honeypot: 'bot filled this'
      })
    });
    assert.strictEqual(botRes.status, 200, 'Honeypot trigger should return 200 silent success to trap bot');
    const countAfter = await db('submissions').count('id as count').first();
    assert.strictEqual(
      Number(countAfter.count),
      Number(countBefore.count),
      'Honeypot submission must NOT be stored in database'
    );
    console.log('✓ Probe 6 (Honeypot trap) passed');

    // -------------------------------------------------------------
    // 8. DASHBOARD ANALYTICS & STATS (Tenant Isolated)
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Dashboard Analytics & Tenant Isolation');
    const statsResA = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(statsResA.status, 200);
    const statsA = await statsResA.json();
    assert.ok(statsA.total_submissions >= 4, 'User A should have at least 4 submissions');

    const statsResB = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(statsResB.status, 200);
    const statsB = await statsResB.json();
    assert.strictEqual(statsB.total_submissions, 1, 'User B should strictly have 1 submission');
    console.log('✓ Dashboard tenant-isolated analytics passed');

    // -------------------------------------------------------------
    // 9. PROBE 3: Rate Limiting
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Probe 3: Rate Limit Burst (20 requests per IP limit)');
    let hitRateLimit = false;
    for (let i = 1; i <= 25; i++) {
      const res = await fetch(`${baseUrl}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '198.51.100.55' // simulate constant remote IP
        },
        body: JSON.stringify({
          widget_id: userAWidgetId,
          data: { email: `burst${i}@example.com` }
        })
      });
      if (res.status === 429) {
        hitRateLimit = true;
        const errJson = await res.json();
        assert.ok(errJson.error.includes('Too many requests'), 'Expected rate limit message');
        break;
      }
    }
    assert.strictEqual(hitRateLimit, true, 'Rate limiter should return 429 after 20 submissions');
    console.log('✓ Probe 3 (Rate limiter burst) passed');

    console.log('\n========================================');
    console.log('ALL PROBES & TESTS PASSED SUCCESSFULLY! ✓');
    console.log('========================================\n');
  } finally {
    server.close();
    await db.destroy();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
