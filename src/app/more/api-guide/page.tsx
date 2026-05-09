import TransitionLink from "../../../components/TransitionLink"
import OrgIntegrationCTAs from "../../../components/OrgIntegrationCTAs"
import type { Metadata } from "next"
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  SUPPORT_EMAIL,
} from "@/lib/seo"

const SAMPLE_WEBHOOK_EVENTS = [
  "quiz.completed",
  "quiz.created",
  "user.registered",
  "user.scored",
  "payment.received",
  "tournament.started",
  "tournament.ended",
  "certificate.issued",
  "leaderboard.updated",
]

const ORG_REST_ROUTES: [string, string, string][] = [
  ["GET", "/api/org/{slug}/info", "Public org branding (no auth)"],
  ["POST", "/api/org/{slug}/auth", "Org member login (sets httpOnly session cookie)"],
  ["DELETE", "/api/org/{slug}/auth", "Sign out org session"],
  ["GET", "/api/org/{slug}/auth", "Current org session"],
  ["GET", "/api/org/{slug}/members", "List members (owner/admin)"],
  ["POST", "/api/org/{slug}/members", "Add member (owner/admin)"],
  ["GET", "/api/org/{slug}/quizzes", "List quizzes (role-filtered)"],
  ["POST", "/api/org/{slug}/quizzes", "Create quiz (owner/admin/teacher)"],
  ["POST", "/api/org/{slug}/quizzes/import", "Import quiz (JSON/PDF)"],
  ["GET", "/api/org/{slug}/quizzes/{quizId}", "Quiz detail / take flow"],
  ["PATCH", "/api/org/{slug}/quizzes/{quizId}", "Publish/archive (owner/admin/teacher)"],
  ["GET", "/api/org/{slug}/leaderboard", "Org leaderboard"],
  ["GET", "/api/org/{slug}/analytics", "Analytics (owner/admin/teacher)"],
  ["GET", "/api/org/{slug}/notifications", "Notifications (owner/admin/teacher)"],
  ["GET", "/api/org/{slug}/audit", "Audit log (owner/admin/teacher)"],
  ["GET", "/api/org/{slug}/integrity", "Integrity events"],
  ["POST", "/api/org/{slug}/integrity", "Report integrity event"],
  ["GET", "/api/org/{slug}/api-keys", "List org API keys (owner/admin)"],
  ["POST", "/api/org/{slug}/api-keys", "Create org API key (owner/admin)"],
  ["PATCH", "/api/org/{slug}/api-keys/{keyId}", "Enable/disable key (owner/admin)"],
]

export const metadata: Metadata = {
  title: "Organization API Guide | API Keys, Auth, Integrations",
  description:
    "Complete organization integration guide for IQ Earners: org portal login, API key creation, auth patterns, org REST routes, webhook model, and security best practices.",
  alternates: { canonical: `${SITE_URL}/more/api-guide` },
  openGraph: {
    title: `Organization API Guide | ${SITE_NAME}`,
    description:
      "Step-by-step docs for schools and partners to integrate with IQ Earners securely.",
    url: `${SITE_URL}/more/api-guide`,
    siteName: SITE_NAME,
    type: "article",
    images: [{ url: DEFAULT_OG_IMAGE_URL, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: "IQ Earners API Guide" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Organization API Guide | ${SITE_NAME}`,
    description: "API keys, auth, routes, and integration security for organizations.",
    images: [DEFAULT_OG_IMAGE_URL],
  },
}

export default function OrgApiGuidePage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Organization API Keys Integration Guide",
    description:
      "Step-by-step documentation for organization API key management, authentication, route usage, and security practices.",
    url: `${SITE_URL}/more/api-guide`,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    image: [DEFAULT_OG_IMAGE_URL],
    inLanguage: "en-IN",
    dateModified: new Date().toISOString(),
    mainEntityOfPage: `${SITE_URL}/more/api-guide`,
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "More", item: `${SITE_URL}/more` },
      { "@type": "ListItem", position: 3, name: "API Guide", item: `${SITE_URL}/more/api-guide` },
    ],
  }

  return (
    <main className="min-h-screen app-page-surface text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06060c]/92 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <TransitionLink href="/more" className="text-[11px] font-bold text-white/60 hover:text-white">
            ← Support center
          </TransitionLink>
          <TransitionLink href="/home" className="text-[11px] font-black uppercase tracking-widest text-primary">
            {SITE_NAME}
          </TransitionLink>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-14 space-y-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-black">Organizations &amp; integrations</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">API keys &amp; integration guide</h1>
          <p className="mt-3 text-sm text-white/65 max-w-3xl leading-relaxed">
            External schools and companies do <strong className="text-white/90">not</strong> use the platform admin dashboard.
            Organization owners and admins manage API keys from the <strong className="text-white/90">organization portal</strong> after signing in.
            Platform operators still use the internal admin console for global settings and cross-tenant webhooks.
          </p>
          <p className="mt-4 text-[11px] text-white/45 max-w-3xl leading-relaxed">
            Need access or integration help? Email <a className="text-cyan-300/90 underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or use the actions below (no sponsorship forms on this page).
          </p>
          <div className="mt-5">
            <OrgIntegrationCTAs />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <TransitionLink href="/more#org-integration" className="rounded-lg border border-white/25 px-4 py-2 text-xs font-bold text-white/85 hover:text-white hover:border-white/40">
              Organization setup help
            </TransitionLink>
            <TransitionLink href="/more/faq" className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:text-white">
              FAQ
            </TransitionLink>
            <TransitionLink href="/more/privacy" className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:text-white">
              Privacy Policy
            </TransitionLink>
              <span className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50">
              Replace <code className="text-cyan-300/90">{"{slug}"}</code> and <code className="text-cyan-300/90">{"{portal-code}"}</code> with values from your admin (e.g. slug <code className="text-cyan-300/90">acme-academy</code>)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article id="path-a" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 scroll-mt-24">
            <h2 className="text-xl font-black mb-4">Path A — Organization admins (recommended)</h2>
            <ol className="space-y-3 text-sm text-white/75 list-decimal pl-5">
              <li>
                Open your organization login URL:{" "}
                <code className="text-cyan-300/90 text-xs">{"https://<your-domain>/org/<slug>/portal/<portal-code>/login"}</code>
              </li>
              <li>Sign in with an account that has the <span className="text-mint">owner</span> or <span className="text-mint">admin</span> role.</li>
              <li>
                Go to the owner dashboard → <span className="text-mint">API keys</span> tab (
                <code className="text-cyan-300/90 text-xs">/org/&lt;slug&gt;/dashboard</code>
                ).
              </li>
              <li>Create a key, pick permissions, set a rate limit, and copy the secret once (it is not shown again).</li>
              <li>Enable or disable keys from the same screen; actions are recorded in the org audit trail.</li>
            </ol>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-xl font-black mb-4">Path B — IQ Earners platform staff</h2>
            <p className="text-sm text-white/70 mb-3">
              Internal operators use the admin workspace for <strong className="text-white/85">cross-tenant</strong> keys, webhooks, and global configuration.
              This area is not exposed to external organizations.
            </p>
            <TransitionLink href="/more/admin-dashboard" className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:text-white">
              Admin dashboard (staff only)
            </TransitionLink>
          </article>
        </div>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <h2 className="text-xl font-black mb-3">How org integrations work today</h2>
          <div className="space-y-4 text-sm text-white/70 leading-relaxed">
            <p>
              Login URLs include a per-organization <strong className="text-white/90">portal code</strong> in the path. The login API expects{" "}
              <code className="text-cyan-300/90 text-xs">portalCode</code> in the JSON body together with username and password.
            </p>
            <p>
              <strong className="text-white/90">Live org data</strong> is accessed through{" "}
              <code className="text-cyan-300/90 text-xs">/api/org/{"{slug}"}/…</code> routes. After org login, the browser (or your server)
              holds an <strong className="text-white/90">httpOnly</strong> session cookie. Use{" "}
              <code className="text-cyan-300/90 text-xs">credentials: &quot;include&quot;</code> in fetch or equivalent in your HTTP client.
            </p>
            <p>
              <strong className="text-white/90">API keys</strong> you create in the org dashboard are stored as{" "}
              <strong className="text-white/90">organization-scoped secrets</strong> and are intended for{" "}
              <strong className="text-white/90">server-to-server</strong> Bearer authentication (for example a future or partner-enabled{" "}
              <code className="text-cyan-300/90 text-xs">/api/v1</code> surface). Until that surface is enabled for your tenant, prefer the org session +{" "}
              <code className="text-cyan-300/90 text-xs">/api/org/…</code> pattern from your backend.
            </p>
          </div>
        </article>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-xl font-black mb-4">Bearer authentication (API keys)</h2>
            <p className="text-sm text-white/70 mb-3">When calling Bearer-protected endpoints, send:</p>
            <pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs overflow-x-auto text-mint"><code>{`Authorization: Bearer iq_live_xxxxxxxxxxxxxxxx`}</code></pre>
            <p className="text-xs text-white/45 mt-3">
              Keys are generated with the <code className="text-mint/80">iq_live_</code> prefix. Store them only in environment variables on your server.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-xl font-black mb-4">Quick install samples</h2>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2 font-bold">Node.js — org session (server)</p>
                <pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs overflow-x-auto text-mint"><code>{`// After obtaining session cookie from your login flow:
const res = await fetch(\`\${BASE}/api/org/\${SLUG}/quizzes\`, {
  headers: { Cookie: orgSessionCookie },
});
const data = await res.json();`}</code></pre>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2 font-bold">Node.js — Bearer (when enabled)</p>
                <pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs overflow-x-auto text-mint"><code>{`const res = await fetch(\`\${BASE}/api/v1/quizzes\`, {
  headers: { Authorization: \`Bearer \${process.env.IQE_API_KEY}\` },
});
const data = await res.json();`}</code></pre>
                <p className="text-[10px] text-amber-200/80 mt-2">
                  Example only: use a server-side env var (never <code className="text-mint/90">NEXT_PUBLIC_*</code>); the snippet above is static text, not executed in the browser.
                </p>
              </div>
            </div>
          </article>
        </div>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <h2 className="text-xl font-black mb-4">Organization REST routes (reference)</h2>
          <p className="text-sm text-white/60 mb-4">
            Replace <code className="text-cyan-300/90">{"{slug}"}</code> with your organization slug. Most routes require an org session cookie and the right role.
          </p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {ORG_REST_ROUTES.map(([method, path, desc]) => (
              <div key={path + method} className="flex gap-3 items-start rounded-lg border border-white/10 bg-black/20 p-3">
                <span className={`text-[10px] font-black rounded px-2 py-0.5 shrink-0 ${method === "GET" ? "bg-emerald-500/15 text-emerald-300" : method === "POST" ? "bg-amber-500/15 text-amber-300" : method === "PATCH" ? "bg-sky-500/15 text-sky-300" : "bg-red-500/15 text-red-300"}`}>{method}</span>
                <div className="min-w-0">
                  <code className="text-xs text-mint break-all">{path}</code>
                  <p className="text-[11px] text-white/50">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <h2 className="text-xl font-black mb-4">Webhooks</h2>
          <p className="text-sm text-white/70 mb-3">
            Outbound webhooks are configured from the <strong className="text-white/85">platform admin</strong> workspace today (cross-tenant).
            If you need org-specific webhook delivery or signing secrets, request it from{" "}
            <a className="text-cyan-300/90 underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            so routing and security match your contract.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SAMPLE_WEBHOOK_EVENTS.map((event) => (
              <span key={event} className="text-[10px] rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1 text-white/70">{event}</span>
            ))}
          </div>
          <pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs overflow-x-auto text-mint"><code>{`POST https://your-org-domain.com/webhooks/iqe
Content-Type: application/json

{ "event": "quiz.completed", "data": { }, "timestamp": "..." }`}</code></pre>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <h2 className="text-xl font-black mb-4">Security checklist</h2>
          <ul className="list-disc pl-5 text-sm text-white/70 space-y-2">
            <li>Never expose API keys or org passwords in frontend bundles or public repos.</li>
            <li>Use one key per integration (LMS, ERP, internal cron) so you can revoke independently.</li>
            <li>Grant the minimum permissions that integration actually needs.</li>
            <li>Rotate keys periodically; disable keys immediately when a vendor contract ends.</li>
            <li>Prefer server-side calls; if you proxy from your LMS backend, validate your own users first.</li>
          </ul>
        </article>
      </section>
    </main>
  )
}
