# Frontend on Vercel + Backend on Render

This setup keeps your UI on Vercel and sends mock-exam heavy API traffic to Render.

## 1) Deploy backend to Render

- Deploy the same repo (or backend copy) to Render.
- Ensure backend has these env vars at minimum:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `MOCK_EXAM_AI_API_KEY`
  - `ADMIN_PASSWORD`
  - `PAYMENT_WEBHOOK_SECRET`

After deploy, copy your Render URL, e.g.:

- `https://quiz-backend.onrender.com`

## 2) Configure frontend (Vercel)

In Vercel project env vars, set:

- `NEXT_PUBLIC_RENDER_BACKEND_URL=https://quiz-backend.onrender.com`

Redeploy frontend after setting env var.

## 3) How routing works

Frontend uses Next rewrite:

- `/render-api/:path* -> https://your-render-domain/api/:path*`

Only these API families are redirected by the app helper:

- `/api/mock-exam/*`
- `/api/admin/mock-exam*`
- `/api/admin/quiz/ai-status`

All other APIs stay on Vercel unless you expand the helper.

## 4) Verification checklist

1. Open admin -> Mock Exam settings.
2. Try **Generate with AI**.
3. In browser network tab, confirm calls hit `/render-api/...`.
4. Confirm responses return from Render and data appears in Supabase.

## 5) Common issues

- **403 on admin endpoints**: Render does not share Vercel cookies. Keep admin actions routed via Vercel if auth depends on cookies, or implement token-based auth shared with Render.
- **Cold start delay on Render free**: first request may take time if service slept.
- **Large PDFs timeout**: use smaller chunks, quick mode, or paid Render plan.
