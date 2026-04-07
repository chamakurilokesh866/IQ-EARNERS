# Deployment Guide: GitHub → Supabase → Vercel or Render

Complete process to upload code to GitHub, set up Supabase (for persistent data), and deploy to Vercel or Render.

---

## Part 1: Push Your Code to GitHub

### Step 1.1: Install Git (if needed)

Download and install from: **https://git-scm.com/download/win**

### Step 1.2: Create a GitHub Repository

1. Go to **https://github.com** and sign in
2. Click **+** (top right) → **New repository**
3. Name it (e.g. `quizmaster-pro` or `iq-earners`)
4. Choose **Private** or **Public**
5. **Do not** initialize with README (you already have code)
6. Click **Create repository**

### Step 1.3: Push Your Code

Open **PowerShell** or **Command Prompt** and run:

```powershell
cd "c:\Users\Chama\OneDrive\Documents\Quiz\nextjs"

# Initialize git (if not already)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit"

# Add your GitHub repo as remote (replace YOUR_USERNAME and YOUR_REPO with yours)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 1.4: GitHub Authentication

If prompted for credentials:
- Use **GitHub username** and a **Personal Access Token** (not password)
- Create a token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Or use **GitHub Desktop** / **Git Credential Manager** for easier login

---

## Part 2: Set Up Supabase (Free Database & Storage)

Supabase provides free PostgreSQL database and file storage so your data persists (quiz schedules, reports, uploads).

### Step 2.1: Create Supabase Project

1. Go to **https://supabase.com** and sign up (free)
2. Click **New Project**
3. **Organization:** Create or select one
4. **Name:** `quizmaster-pro` (or any name)
5. **Database Password:** Set a strong password (save it)
6. **Region:** Choose closest to your users
7. Click **Create new project** (takes ~2 min)

### Step 2.2: Get Connection Details

1. In your project, go to **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (safe for client)
   - **service_role** key (secret, server-only)
3. Go to **Settings** → **Database** → copy **Connection string** (URI) if needed

### Step 2.3: Run Supabase SQL (required for Vercel)

1. Supabase Dashboard → **SQL Editor** → New query
2. Paste and run the contents of `supabase-setup.sql`
3. This creates: `quiz_schedule`, `reports`, and `settings` tables
4. Settings table stores admin toggles (Demo Questions, Maintenance Mode), entry fee, QR image URL – required for admin panel to work on Vercel

### Step 2.4: Create Storage Bucket (for PDFs, screenshots, QR)

1. In Supabase sidebar: **Storage** → **New bucket**
2. Name: `uploads`
3. Enable **Public bucket** if files should be publicly accessible
4. Click **Create bucket**
5. (Optional) Add policies for upload/read in **Policies** tab

### Step 2.5: Add Supabase Env Vars

Add these to your `.env.local` and to Vercel/Render later:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note:** Your current app uses JSON files and local disk. Migrating to Supabase requires code changes (API routes that write to Supabase instead of files). Supabase setup here gives you the credentials; integration work is a separate step.

---

## Part 3: Deploy to Vercel

### Step 3.1: Sign Up / Log In

1. Go to **https://vercel.com**
2. Sign up or log in with **GitHub**

### Step 3.2: Import Project

1. Click **Add New** → **Project**
2. Select your GitHub repository
3. **Root Directory:** Leave as is (or set to `nextjs` if your repo contains a parent folder)
4. **Framework Preset:** Next.js (auto-detected)
5. **Build Command:** `npm run build` (default)
6. **Output Directory:** (leave default)

### Step 3.3: Add Environment Variables

Before deploying, add your env vars:

1. In the import screen, expand **Environment Variables**
2. Add each variable from your `.env.local`:

| Name | Value |
|------|-------|
| `ADMIN_USERNAME` | Your admin username |
| `ADMIN_PASSWORD` | Your admin password |
| `ADMIN_OTP` | Your 6-digit OTP |
| `ADMIN_DASHBOARD_SLUG` | Secret slug for admin URL |
| `PAYMENT_WEBHOOK_SECRET` | Secure random string |
| `CASHFREE_APP_ID` | (if using Cashfree) |
| `CASHFREE_SECRET_KEY` | (if using Cashfree) |
| `CASHFREE_ENV` | `production` |
| `CASHFREE_WEBHOOK_SECRET` | (if using Cashfree) |
| `NEXT_PUBLIC_DEFAULT_UPI` | (optional) |
| `NEXT_PUBLIC_SUPABASE_URL` | (from Supabase, if using) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from Supabase, if using) |
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase, if using) |

3. Click **Deploy**

### Step 3.4: Post-Deploy

- Your site will be live at `https://your-project.vercel.app`
- Each push to `main` triggers a new deployment automatically
- To add/change env vars later: **Project → Settings → Environment Variables → Redeploy**

---

## Part 4: Alternative – Deploy to Render

### Step 4.1: Sign Up / Log In

1. Go to **https://render.com**
2. Sign up or log in with **GitHub**

### Step 4.2: Create Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repository (or connect GitHub account first)
3. Select your repo
4. Configure:
   - **Name:** `quizmaster-pro` (or any name)
   - **Region:** Choose closest (e.g. Oregon)
   - **Root Directory:** `nextjs` (if repo root is parent folder) or leave blank
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or paid for better performance)

### Step 4.3: Environment Variables on Render

1. Scroll to **Environment Variables**
2. Click **Add Environment Variable**
3. Add the same variables as in the Vercel section (from `.env.local`)

### Step 4.4: Deploy

1. Click **Create Web Service**
2. Render will build and deploy
3. Your site will be at `https://your-service-name.onrender.com`

### Render Notes

- **Free tier:** Spins down after ~15 min inactivity; first request may take 30–60 seconds
- **Custom domain:** Settings → Custom Domain
- **Auto-deploy:** Enabled by default on push to main branch

---

## Part 5: Cashfree Setup (if using payments)

### 5.1 Payment Form Redirect URL

When using Cashfree Payment Forms (e.g. `https://payments.cashfree.com/forms/IQEARNERSFEE`):

1. Go to **Cashfree Dashboard** → **Payment Forms** → select your form → Edit
2. Set **Redirect URL** to the **base URL only** (no query params or placeholders):
   ```
   https://YOUR-DOMAIN.com/payment/callback
   ```
   Example: `https://quiz-seven-liard-61.vercel.app/payment/callback`
3. Cashfree automatically appends `?order_id=...` when redirecting after payment. Do **not** add `?order_id={order_id}` – that placeholder is not substituted and will break the flow.

### 5.2 Webhook URL

Set your Cashfree webhook URL in the Cashfree Dashboard:

- **Vercel:** `https://your-project.vercel.app/api/payments/webhook`
- **Render:** `https://your-service.onrender.com/api/payments/webhook`

---

## Important: File Storage on Serverless

**Vercel and Render use ephemeral filesystems.** Data stored in files (JSON, uploaded PDFs, screenshots) will **not persist** across deploys or restarts.

Affected features:
- Quiz scheduler PDF uploads
- User report screenshots
- JSON-based data (settings, schedules, reports)
- QR code uploads

For production with persistent data, you would need:
- **Database:** Supabase, Vercel Postgres, or MongoDB Atlas
- **File storage:** Vercel Blob, Cloudflare R2, or AWS S3

---

## Quick Reference: Full Process

| Order | Step | Platform | URL |
|-------|------|----------|-----|
| 1 | Push code | **GitHub** | github.com |
| 2 | Database & storage (optional) | **Supabase** | supabase.com |
| 3 | Deploy app | **Vercel** or **Render** | vercel.com / render.com |

**Commands:**
```powershell
# 1. Push to GitHub
git add .
git commit -m "Update"
git push origin main

# 2. Supabase – use dashboard (no CLI needed for setup)
# 3. Vercel/Render – auto-deploys on push
```
