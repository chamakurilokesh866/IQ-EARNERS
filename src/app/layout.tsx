import type { ReactNode } from 'react'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import '../styles/globals.css'
import { Poppins, Playfair_Display, Syne, Pacifico } from 'next/font/google'
import FooterGate from '../components/FooterGate'
import { UIProvider } from '../context/UIContext'
import { BootstrapProvider } from '../context/BootstrapContext'
import { ThemeProvider } from '../context/ThemeContext'
import { QuizFullscreenProvider } from '../context/QuizFullscreenContext'
import { ReportProvider } from '../context/ReportContext'
import { ToastProvider } from '../context/ToastContext'
import { NotificationProvider } from '../context/NotificationContext'
/* StickyAdFooter removed from root layout — loaded per-page where needed */
import Preloader from '../components/Preloader'
import PwaRegister from '../components/PwaRegister'
import CsrfInit from '../components/CsrfInit'
import SingleTabEnforcer from '../components/SingleTabEnforcer'
import BackButtonRefresh from '../components/BackButtonRefresh'
import DomainGuard from '../components/DomainGuard'
import JsonLd from '../components/JsonLd'
import SeoVerificationMeta from '../components/SeoVerificationMeta'
import BlockedGate from '../components/BlockedGate'
import SkipLink from '../components/SkipLink'
import PageTransition from '../components/PageTransition'
import SkeletonLoader from '../components/SkeletonLoader'
import MainContentWrapper from '../components/MainContentWrapper'
import MobileBottomNav from '../components/MobileBottomNav'
import LiquidGlassPointer from '../components/LiquidGlassPointer'
import CookieBanner from '../components/CookieBanner'

const NetworkStatus = dynamic(() => import('../components/NetworkStatus'), { ssr: false })
const InstallPrompt = dynamic(() => import('../components/InstallPrompt'), { ssr: false })
const TransitionLoader = dynamic(() => import('../components/TransitionLoader'), { ssr: false })
const ClientOnlyAdPopup = dynamic(() => import('../components/ClientOnlyAdPopup'), { ssr: false })
const NoticeBanner = dynamic(() => import('../components/NoticeBanner'), { ssr: false })
const ReportButton = dynamic(() => import('../components/ReportButton'), { ssr: false })
const SocialMediaFloat = dynamic(() => import('../components/SocialMediaFloat'), { ssr: false })
const ParticipantsOverlay = dynamic(() => import('../components/ParticipantsOverlay'), { ssr: false })
const VerticalAdSidebars = dynamic(() => import('../components/VerticalAdSidebars'), { ssr: false })
const SidebarGate = dynamic(() => import('../components/SidebarGate'), { ssr: false })
const FloatingActions = dynamic(() => import('../components/FloatingActions'), { ssr: false })
/* NotebookBackground removed: returns null (no-op), saves a client component mount */
const InspectGuard = dynamic(() => import('../components/InspectGuard'), { ssr: false })
const InspectBlockedGate = dynamic(() => import('../components/InspectBlockedGate'), { ssr: false })
const CapacitorBridge = dynamic(() => import('../components/CapacitorBridge'), { ssr: false })

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-sans', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-display', display: 'swap', preload: false })
const syne = Syne({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-intro', display: 'swap', preload: false })
const pacifico = Pacifico({ subsets: ['latin'], weight: ['400'], variable: '--font-pacifico', display: 'swap', preload: false })


import { SITE_URL, SITE_NAME, PARENT_COMPANY_NAME, SEO_KEYWORDS, DEFAULT_DESCRIPTION, SITE_TAGLINE } from '@/lib/seo'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? SITE_URL),
  title: {
    default: `${SITE_NAME} | Online Quiz India – Daily GK, Tournaments & Win Prizes`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: `${SITE_NAME} (${PARENT_COMPANY_NAME})`,
  applicationName: SITE_NAME,
  category: "Education",
  classification: "Online Quiz Platform",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml', sizes: 'any' }],
    shortcut: '/logo.svg',
    apple: [{ url: '/logo.svg', sizes: '180x180', type: 'image/svg+xml' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: `${SITE_NAME} – ${SITE_TAGLINE}`,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: { telephone: false, email: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} | Online Quiz India – Win Real Prizes`,
    description: DEFAULT_DESCRIPTION,
    locale: 'en_IN',
    countryName: 'India',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Online Quiz India – Daily Quizzes & Prizes`,
    description: DEFAULT_DESCRIPTION,
    creator: '@iqearners',
    site: '@iqearners',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en-IN': SITE_URL,
      'en': SITE_URL,
    },
  },
}
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#06040f',
}

const criticalCss = `
  *{box-sizing:border-box}
  html,body{min-height:100vh;margin:0;background:#06040f!important;color:#e2e8f0!important;font-family:system-ui,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%;width:100%;max-width:100vw;overflow-x:hidden}
  html[data-theme="dark"] a{color:#c4b5fd!important}
  html[data-theme="dark"] a:hover{color:#ddd6fe!important}
  html[data-theme="dark"] .card{background:#0f1628!important;border-color:rgba(255,255,255,0.1)!important;color:#e2e8f0!important}
  html[data-theme="dark"] .pill{background:rgba(255,255,255,0.06)!important;border-color:rgba(255,255,255,0.12)!important;color:#cbd5e1!important}
  body{touch-action:manipulation}
  body input,body textarea,body [contenteditable="true"]{user-select:text;-webkit-user-select:text;font-size:16px!important}
  .quiz-fullscreen-active{user-select:none;-webkit-user-select:none}
  img,svg,video,canvas{max-width:100%;height:auto}
  a{color:#a78bfa!important;text-decoration:none!important}
  a:hover{color:#7c3aed!important}
  nav{display:flex;align-items:center;gap:clamp(0.5rem,2vw,1.5rem);font-size:.875rem;flex-wrap:wrap;min-width:0}
  .card{background:#0f1628;border:1px solid rgba(255,255,255,0.1);border-radius:1rem;padding:1rem;box-shadow:0 4px 24px rgba(0,0,0,0.35);max-width:100%}
  .pill{padding:.25rem .75rem;border-radius:9999px;font-size:.875rem;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);color:#c4b5fd}
  .pill.bg-accent{background:#fef3c7!important;border-color:#fde68a!important;color:#92400e!important}
  /* min-height:0 — flex shell (#main-content / .portal-wipe-in) owns height; 100vh on main caused huge empty bands with flex-1 children */
  main{min-height:0;width:100%;max-width:100vw;overflow-x:hidden;padding:0;position:relative;z-index:1}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
`



export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark" data-ui="aurora" style={{ scrollBehavior: 'smooth' }}>
      <head>
        {/* Instant redirect script: Fastest way to move users from / to /intro */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var path = window.location.pathname;
              var isRoot = path === '/' || path === '' || path === '/index.html';
              if (isRoot) {
                window.location.replace('/intro' + window.location.search);
              }
            })();
          `
        }} />

        {/* CSP is set via HTTP headers in next.config.mjs — avoid duplicate meta CSP */}
        <meta httpEquiv="Permissions-Policy" content="public-key-credentials=(self), xr-spatial-tracking=()" />
        <link rel="dns-prefetch" href="https://api.cashfree.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://sdk.cashfree.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="lazyOnload" />
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4354698332033727" crossOrigin="anonymous"></script>
        <link rel="preconnect" href="https://challenges.cloudflare.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              if (window.location.pathname === '/blocked' || window.location.pathname === '/unblock') return;
              if (document.cookie.includes('role=admin')) return;
              
              var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 1024;
              if (isMobile) return;

              // Disabled invasive DevTools opening checks that cause false positives
              // such as resizing and debugger
            })();
          `
        }} />
        <JsonLd />
        <SeoVerificationMeta />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var stored = localStorage.getItem('iq_theme');
    var next = stored === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
            `.trim(),
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        {/* Fail-safe: Force hide preloader if it stays too long (prevents "Logo Only" bug) */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function hide() {
                var p = document.getElementById('app-preloader');
                if (p) {
                  p.style.opacity = '0';
                  setTimeout(function() { if(p.parentNode) p.parentNode.removeChild(p); }, 500);
                }
              }
              function warn() {
                var p = document.getElementById('app-preloader');
                if (p) {
                   // Inject slow network warning directly into DOM if preloader stuck
                   var text = p.querySelector('.animate-pulse');
                   if (text) {
                     text.textContent = 'Poor Connection Detected';
                     text.style.color = '#fbbf24';
                   }
                }
              }
              // Warn after 2s, force hide after 4s (mobile reliability)
              setTimeout(warn, 2000);
              setTimeout(hide, 4000);
            })();
          `
        }} />

      </head>
      <body className={`ui-refresh-v3 ${poppins.variable} ${playfair.variable} ${syne.variable} ${pacifico.variable} ${poppins.className} bg-[#020205] text-[#e2e8f0] antialiased`} style={{ minHeight: '100vh' }}>
        <LiquidGlassPointer />
        <ThemeProvider>
        <BootstrapProvider>
          <UIProvider>
            <QuizFullscreenProvider>
              <ReportProvider>
                <NotificationProvider>
                  <ToastProvider>
                    <>
                      <SkipLink />
                      <Suspense fallback={null}>
                        <SingleTabEnforcer />
                        <BackButtonRefresh />
                        <DomainGuard />
                        <BlockedGate />
                        <InspectBlockedGate />
                        <InspectGuard />
                      </Suspense>
                      <CsrfInit />
                      <Preloader />
                      <NetworkStatus />
                      <PwaRegister />
                      <InstallPrompt />
                      <TransitionLoader />
                      <ClientOnlyAdPopup />
                      <NoticeBanner />
                      <VerticalAdSidebars />
                      <SidebarGate />
                      <Suspense fallback={<SkeletonLoader />}>
                        <MainContentWrapper>
                          <PageTransition>{children}</PageTransition>
                        </MainContentWrapper>
                      </Suspense>

                      <MobileBottomNav />
                      <FooterGate />
                      <ParticipantsOverlay />
                      <SocialMediaFloat />
                      <ReportButton />
                      <CookieBanner />
                      <FloatingActions />
                      <CapacitorBridge />
                    </>
                  </ToastProvider>
                </NotificationProvider>
              </ReportProvider>
            </QuizFullscreenProvider>
          </UIProvider>
        </BootstrapProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
