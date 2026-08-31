# FlyRank Widget Platform — PostgreSQL & Deployment Guide

This guide details how to switch from development SQLite to production **PostgreSQL** and deploy the platform to modern cloud hosts (Render, Railway, Fly.io, or Docker).

---

## 1. Quick Local PostgreSQL via Docker Compose

The easiest way to run the platform locally with PostgreSQL is using Docker Compose:

```bash
docker compose up --build
```

This starts:
1. A **PostgreSQL 16** database on port `5432`.
2. The **FlyRank Node.js API** on port `3000`, which automatically runs Knex migrations, seeds initial tenant data, and boots the server.

To stop the containers:
```bash
docker compose down
```

---

## 2. Using PostgreSQL in Development (without Docker)

If you have PostgreSQL installed on your machine or want to use a free cloud database (such as [Neon.tech](https://neon.tech), [Supabase](https://supabase.com), or [Aiven](https://aiven.io)):

### Step 1: Update your `.env`
Set `NODE_ENV=production` and provide your `DATABASE_URL`:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://username:password@your-db-host.com:5432/dbname?sslmode=require
DB_SSL=true
JWT_SECRET=b7601154e7a3089af8af11b21e345e4efaf16eb6075dc082b3ab82562bd5f2c0
BASE_URL=http://localhost:3000
```

### Step 2: Run Migrations on PostgreSQL
```bash
npx knex migrate:latest --env production
```

### Step 3: Run Seed Data (Optional)
```bash
npx knex seed:run --env production
```

### Step 4: Start Server
```bash
npm start
```

---

## 3. Deploying to Cloud Providers

### Option A: Deploy to Render.com (Recommended)

1. **Push your code to GitHub** (already done: `https://github.com/SKKammar/flyrank-capstone-widgetplatform`).
2. **Log into [Render Dashboard](https://dashboard.render.com)**.
3. **Create a PostgreSQL Database**:
   - Click **New +** $\rightarrow$ **PostgreSQL**.
   - Name: `flyrank-db`.
   - Copy the **Internal Database URL**.
4. **Create a Web Service**:
   - Click **New +** $\rightarrow$ **Web Service** $\rightarrow$ Connect `flyrank-capstone-widgetplatform`.
   - **Environment**: `Node`.
   - **Build Command**: `npm install && npm run migrate`
   - **Start Command**: `npm start`
5. **Set Environment Variables in Render**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(paste your Internal Database URL from step 3)*
   - `DB_SSL`: `true`
   - `JWT_SECRET`: *(generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*
   - `BASE_URL`: `https://your-app-name.onrender.com`
6. Click **Deploy**.

---

### Option B: Deploy to Railway.app

1. Go to [Railway.app](https://railway.app) $\rightarrow$ **New Project** $\rightarrow$ **Deploy from GitHub repo**.
2. Add a **PostgreSQL** database service to the canvas.
3. In your Web Service settings, add the environment variables:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Railway references this automatically)
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(your 64-character secret)*
   - `BASE_URL`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
4. Set **Build Command**: `npm install && npm run migrate`
5. Set **Start Command**: `npm start`

---

### Option C: Deploy to Fly.io

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
2. Launch app and create PostgreSQL cluster:
   ```bash
   fly launch
   fly postgres create
   fly postgres attach --app flyrank-capstone-widgetplatform
   ```
3. Set secrets:
   ```bash
   fly secrets set JWT_SECRET="your_secret_here" NODE_ENV="production"
   ```
4. Deploy:
   ```bash
   fly deploy
   ```

---

## 4. Production Architectural Details

* **Connection Pooling**: `knexfile.js` configures pool sizes `min: 2, max: 10` for PostgreSQL.
* **Dialect Portability**: Dashboard analytics dynamically use `to_char(s.created_at, 'YYYY-MM-DD')` when connected to PostgreSQL vs `strftime()` on SQLite.
* **SSL Handling**: Supports self-signed and cloud certificates automatically when `DB_SSL=true` or when SSL is enabled in `DATABASE_URL`.
