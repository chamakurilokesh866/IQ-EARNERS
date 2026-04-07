/**
 * IQ Earners — same codebase as website, built as native app for Play Store & App Store.
 * Deploy your Next.js site first, then set CAPACITOR_APP_URL and run:
 *   npm run cap:sync
 *   npm run cap:open:android   OR   npm run cap:open:ios
 */
// Set CAPACITOR_APP_URL when building the app (e.g. https://www.iqearners.online)
const APP_URL = process.env.CAPACITOR_APP_URL || "https://your-domain.com"

const config = {
  appId: "com.iqearners.app",
  appName: "IQ Earners",
  webDir: "public",
  server: {
    url: APP_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
    },
  },
}

export default config
