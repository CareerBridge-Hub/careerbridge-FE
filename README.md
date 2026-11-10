# CareerBridge

CareerBridge landing page (React + Vite), built on top of a rebuilt Webflow landing template.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build
npm run lint
```

## How it's put together

- `src/styles/webflow.*.css` — the original Webflow stylesheets, unchanged except for asset urls.
  Components use the original class names, so layout and responsive behaviour come from here.
- `src/styles/custom.css` — the site's custom-code embeds (scrollbar, typed cursor, marquee) plus a few
  resets for elements that became real `<button>`s.
- `src/lib/ix.ts` — a small replacement for Webflow Interactions on the Web Animations API. Each component
  declares its timelines as data transcribed from the original IX2 config
  (`../docs/research/tracky.so/ix2-summary.txt`).
- `src/components/` — one file per page region; `Showcase.tsx` holds the four feature blocks,
  `Outro.tsx` the cat, marquee and footer.
- `public/assets/` — every image, font and the confetti Lottie, pulled by `npm run download-assets`.

## QA

`npm run qa` drives the built site in headless Chrome (remote debugging on port 9222, preview server on
4173) and checks typing, tabs, card hover, slider autoplay, the announcement close and cookie consent.

## Connected CareerBridge application

The `/app` flow now uses backend-managed HttpOnly cookie authentication and the Rust API rather than a localStorage demo database. Copy `.env.example` to `.env.local`, set only `VITE_API_URL=/api/v1` (Vite proxies to the Rust backend), then run `npm ci` and `npm run dev`. Keep all database, storage-secret, encryption, and LLM credentials on the server.

The backend repository's `docs/SETUP.md` describes migrations, private CV Storage, JWT signing keys, model provisioning, and the real-service smoke test. `docs/openapi.json` is the HTTP contract. Training fixtures are labeled **Data contoh**; the four admin catalog/moderation screens are connected to the backend, including CSV imports and persistent vacancy visibility. Admin accounts enter at `/app/admin/skill`; ordinary users remain on the career dashboard.

Checks: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint`, and `npm run build`. `npm run test:e2e` drives the core browser journey against the backend's disposable fixture server; see its setup guide for `CHROME_BIN`, `E2E_CV_PATH`, and test URLs. Never point fixture bootstrap scripts at a real Supabase database.

Authentication endpoints, CSRF/Origin requirements, production HTTPS/proxy settings, and signup OTP email-template setup are documented in the backend `docs/COOKIE_AUTH.md`. Supabase credentials stay on the server.

Lists use server-side search/filtering and visible pages only: six jobs, twelve trainings and twenty skill-search results. Login does not prefetch catalogs. `npm run test:pagination` runs read-only live browser acceptance with `CHROME_BIN` and local synthetic-account credentials; see backend `docs/PAGINATION.md`.

CV and analysis use authenticated SSE subscriptions. Returning to the CV page restores queued work or its completed review; leaving closes the subscription without cancelling accepted server jobs. See backend `docs/SSE_JOBS.md` for debug logs and proxy settings.

Admin UI browser acceptance uses synthetic API interception: `CHROME_BIN=/path/to/chrome E2E_FRONTEND_URL=http://127.0.0.1:5175 node scripts/qa-admin.mjs`. The backend `docs/ADMIN.md` describes role/RLS checks, imports, deletion behavior, and database acceptance tests.

## Docker deployment to VPS

`.github/workflows/publish-vps.yml` runs on `main` and manual dispatch. Its two jobs
validate and publish an image to GHCR, then deploy that exact image digest over SSH.
The Dockerfile has two stages: Node 24 builds `dist`, then unprivileged Nginx serves
only that output. Existing local `dist` and `.env` files are excluded from the build.
`VITE_API_URL=/api/v1` is baked into the bundle; never put credentials in `VITE_*`.

Set these **frontend repository Actions secrets**:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USERNAME` | SSH user with Docker access |
| `VPS_PASSWORD` | SSH password, matching the backend deployment convention |

SSH uses `StrictHostKeyChecking=accept-new`, matching the backend workflow.
`GITHUB_TOKEN` is supplied automatically. Allow the workflow to publish/read its
GHCR package. The VPS needs Docker Engine with `host-gateway` support and Bash.
The backend must run on the same VPS, publishing port 8080 as in its workflow.
Nginx forwards `/api/` to that port with buffering disabled for SSE and preserves
the request path, cookies, and Origin.

Point your VPS HTTPS reverse proxy to `http://127.0.0.1:3000`. It must overwrite
`X-Forwarded-Proto` with the original scheme, preserve Host, disable response
buffering for `/api/`, allow long-lived SSE connections and CV uploads, and forward
all paths (including `/app/`). Configure backend `AUTH_ORIGINS` and `CORS_ORIGINS`
for the public HTTPS frontend origin and keep `AUTH_COOKIE_SECURE=true`.
Port 3000 binds only to loopback; terminate TLS at that reverse proxy.

The deployment waits for container health and restores the previous container if
startup fails. Replacing the single container causes a brief interruption. The
health check covers static serving; backend availability is monitored separately.
Nginx serves `/app/*` through `app/index.html`, caches hashed `/assets/*` for one
year, revalidates HTML, and returns 404 for missing static files.

Local Docker check (requires the backend on host port 8080):

```bash
docker build --target runtime -t careerbridge-fe .
docker run --rm --add-host host.docker.internal:host-gateway -p 3000:8080 careerbridge-fe
curl -f http://localhost:3000/healthz
curl -f http://localhost:3000/app/pekerjaan
```
