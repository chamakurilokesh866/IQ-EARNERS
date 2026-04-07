# Make the site and app load fast — what to do

## Done in code (already applied)

- **Lazy-loaded components** — NetworkStatus, InstallPrompt, TransitionLoader, ClientOnlyAdPopup, NoticeBanner, ReportButton, ParticipantsOverlay, NotebookBackground load after the main page so first paint is faster.
- **Cache headers** — Static assets (`/_next/static/*`, favicons) are served with long-lived cache so repeat visits and the app load faster.
- **Compression** — Next.js sends responses gzipped (already in `next.config.mjs`).

## What you should do (hosting + monitoring)

### 1. Deploy on a fast host with a CDN

- Prefer **Vercel** (or similar) so the app is at the edge and compressed.
- Use a **custom domain** and keep DNS simple (few redirects).

### 2. Prefer a CDN in front

- Put the site behind **Cloudflare** or your host’s CDN.
- Cache static assets at the edge; keep API routes (`/api/*`) uncached or short-cached.

### 3. Turn on Core Web Vitals

- In **Vercel**: enable **Web Analytics** (or use GA4 / Plausible).
- Watch **LCP**, **INP/FID**, **CLS** on `/`, `/intro`, `/home`, `/daily-quiz` and fix the slowest pages first.

### 4. Images

- Use Next.js `<Image>` with `priority` only for 1–2 above-the-fold images (e.g. logo).
- Prefer **WebP** and small sizes; avoid huge full-screen images.

### 5. App (Capacitor)

- The app loads your **live site**; all website optimizations make the app faster too.
- Ensure the production URL in `capacitor.config.ts` points to the **same fast domain** (with CDN).

### 6. Optional: stronger caching for bootstrap

- If `/api/bootstrap` is slow, add short **stale-while-revalidate** (e.g. 5–10s) in the API route or at the CDN for that path, without caching user-specific data for long.

---

**Summary:** Deploy on Vercel (or similar) with a CDN, enable analytics to track speed, and keep images and JS minimal. The codebase is already tuned for lighter first load and caching.
