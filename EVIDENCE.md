# EVIDENCE.md — Capstone Probe Verification

## Probe 1 — Cross-Origin Submission (POST from second origin)
**Run: open http://localhost:5500 in browser, submit the widget form**

*Network Response:*
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: *
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 900
Content-Type: application/json; charset=utf-8
Content-Length: 60
ETag: W/"3c-t69J7bwgIYZm1m/tIngtY+V5w/c"
Date: Tue, 01 Sep 2026 16:40:37 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"id":"1a1041b6-b24e-4129-a71b-dc39f4e7e70a"}
```
*Server Log:*
```
[SIDE EFFECT] New submission 1a1041b6-b24e-4129-a71b-dc39f4e7e70a for widget aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa
[JOB SUCCESS] SEND_WEBHOOK_SUB_1a1041b6-b24e-4129-a71b-dc39f4e7e70a completed successfully.
```

## Probe 2 — Malformed Payload
**Run: curl -X POST http://localhost:3000/api/submissions -H "Content-Type: application/json" -d '{"bad": true}'**

*Output:*
```http
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: *
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 900
Content-Type: application/json; charset=utf-8
Content-Length: 292
ETag: W/"124-fw5jYXYR2+6s0B6YG60Zz+DMgMs"
Date: Tue, 01 Sep 2026 16:40:37 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Validation failed","details":[{"expected":"string","code":"invalid_type","path":["widget_id"],"message":"Invalid input: expected string, received undefined"},{"expected":"record","code":"invalid_type","path":["data"],"message":"Invalid input: expected record, received undefined"}]}
```

**Run: curl -X POST http://localhost:3000/api/submissions -H "Content-Type: application/json" -d 'this is not json{'**

*Output:*
```http
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 24
ETag: W/"18-CJr4pFJoViXrEpnOqSlEJQdXPWQ"
Date: Tue, 01 Sep 2026 16:40:37 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Invalid JSON"}
```

## Probe 3 — Rate Limit Burst
**Run (shows 429 after 20 requests):**
```bash
for i in $(seq 1 25); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{"widget_id":"aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa","data":{"name":"test"},"honeypot":""}';
done
```

*Output:*
```
201
201
201
201
201
201
201
201
201
201
201
201
201
201
201
201
201
201
201
201
429
429
429
429
429
```

## Probe 4 — Geo Fallback
**Step 1: Break Provider A**

*Server Log:*
```
[GEO] Provider A failed: fetch failed
[GEO] Provider B successful
[SIDE EFFECT] New submission b69b5d6f-40c8-4e1c-b400-1fb6977b0e97 for widget aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa
[JOB SUCCESS] SEND_WEBHOOK_SUB_b69b5d6f-40c8-4e1c-b400-1fb6977b0e97 completed successfully.
```

**Step 2: Break both providers**

*Network Response:*
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: *
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 900
Content-Type: application/json; charset=utf-8
Content-Length: 60
ETag: W/"3c-5dUPxQpz/vB/wkerbIW0FiNos6s"
Date: Tue, 01 Sep 2026 17:38:15 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"id":"cc80542f-02a9-419a-83bd-5bf79417ca1a"}
```

*Server Log:*
```
[GEO] Provider A failed: fetch failed
[SIDE EFFECT] New submission cc80542f-02a9-419a-83bd-5bf79417ca1a for widget aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa
[JOB SUCCESS] SEND_WEBHOOK_SUB_cc80542f-02a9-419a-83bd-5bf79417ca1a completed successfully.
```

## Probe 5 — Side Effect Failure
**Run: Temporarily add throw new Error('forced failure')**

*Network Response:*
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: *
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 900
Content-Type: application/json; charset=utf-8
Content-Length: 60
ETag: W/"3c-Jj/l1n8pGAV4GZ70INYXOGea2CM"
Date: Tue, 01 Sep 2026 17:58:55 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"id":"a144b5b7-e2df-4e1b-a48c-bc3b45561127"}
```

*Server Log:*
```
[JOB FAILED] SEND_WEBHOOK_SUB_a144b5b7-e2df-4e1b-a48c-bc3b45561127 failed. Retrying (1/3) in 1000ms... Error: forced failure
[JOB FAILED] SEND_WEBHOOK_SUB_a144b5b7-e2df-4e1b-a48c-bc3b45561127 failed. Retrying (2/3) in 2000ms... Error: forced failure
[JOB FAILED] SEND_WEBHOOK_SUB_a144b5b7-e2df-4e1b-a48c-bc3b45561127 failed. Retrying (3/3) in 4000ms... Error: forced failure
[CRITICAL FAILURE ALERT] Background job SEND_WEBHOOK_SUB_a144b5b7-e2df-4e1b-a48c-bc3b45561127 permanently failed after 3 retries. Error: forced failure
```

## Probe 6 — Honeypot
**Run: Submit honeypot populated form**

*Output:*
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 98
RateLimit-Reset: 900
Content-Type: application/json; charset=utf-8
Content-Length: 48
ETag: W/"30-1wNJaVFkpcIY7KP2uJVbLBybdGs"
Date: Tue, 01 Sep 2026 16:42:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"message":"Submission received"}
```
