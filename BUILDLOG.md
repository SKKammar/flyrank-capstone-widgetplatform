# BUILDLOG.md

## Where AI Helped
I worked collaboratively with the AI to bring this project to life. To set us up for success, I architected the 10-phase "FlyPlatform — Full Build Guide" and fed the AI highly detailed, meticulously structured prompts. The AI was an excellent execution partner in turning my architectural blueprint into the core mechanics:
- **Phase 1-4 Execution:** Working from my prompts, it rapidly scaffolded the Express server, wired up `knexfile.js` to use `better-sqlite3`, and generated the `uuid`-based migrations for Users, Widgets, and Submissions. It successfully applied the exact configurations I specified, like `useNullAsDefault: true`.
- **The CORS & Rate Limiting Routing:** Guided by my explicit architectural constraints in Phases 2 and 5, the AI correctly isolated the CORS policies—opening up `POST /api/submissions` while locking down the dashboard. It also correctly applied the `express-rate-limit` *only* to the submission endpoint, avoiding the fatal mistake of global limiting.
- **Geo-Enrichment (Phase 5):** The AI successfully implemented the `Promise.race` logic with a 3000ms timeout for the IP enrichment that we discussed, properly failing over from `ip-api.com` to `ipapi.co` and gracefully returning `null` when both failed (Probe 4).
- **Honeypot & Side Effects:** It built the silent `200 OK` honeypot trap to catch bots (Probe 6) and properly structured the `triggerSideEffect` function as a fire-and-forget promise so webhook failures wouldn't crash the main response (Probe 5).

## Where AI Was Wrong
While the AI was great at executing my technical prompts, it occasionally made assumptions that deviated from the `$0 stack` local architecture I designed:
- **Scope Creep:** Instead of sticking strictly to the raw Node.js/SQLite build I outlined, the AI occasionally attempted to introduce unnecessary production complexity. It tried to bring in a Vite frontend build step, Docker Compose files, and even attempted to swap out SQLite for PostgreSQL (`pg`). 
- **Missing Enterprise Patterns:** While it passed the baseline probes perfectly, the AI initially thought the project was finished without realizing we still needed to tackle the "Shared Requirements" (Section 13) that I had planned for the end of the build.

## What I Changed
Throughout the build, I actively reviewed the code, discussed the architecture with the AI, and refined our direction to ensure the final product perfectly matched the Capstone requirements:
- **Maintaining the Pure Architecture:** I stepped in to clean up the AI's scope creep. I removed the Dockerfiles and PostgreSQL dependencies, deleted the unnecessary Vite dashboard setup, and ensured we stuck to the pure, local SQLite architecture and simple `npx serve` test page that I originally designed.
- **Enforcing Tenant Isolation:** I continuously audited the Knex queries the AI generated to guarantee that *every single query* in the Dashboard and Widgets modules included the `user_id` in the `WHERE` clause, preventing any tenant isolation breaches.
- **Building the Shared Requirements:** I guided the AI through the final requirements. Through our collaborative prompts, we built a custom `idempotency_keys` table with an Express middleware to catch duplicate submissions, and a native in-memory background job queue (`src/modules/jobs/queue.js`) to handle webhook retries with exponential backoff.
