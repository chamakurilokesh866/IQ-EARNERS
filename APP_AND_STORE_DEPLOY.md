# IQ Earners — Deploy as Website + Play Store & App Store App

This project runs as **one codebase** for:

1. **Website** — Deploy to Vercel, Netlify, or any Node host (same as now).
2. **Android app** — Build with Capacitor → submit to **Google Play Store**.
3. **iOS app** — Build with Capacitor → submit to **Apple App Store**.

The app is a native shell that loads your **live website** in a fullscreen WebView, so you deploy the site once and the app always shows the latest version.

---

## 1. Deploy the website (unchanged)

Deploy your Next.js app as you already do, for example:

- **Vercel**: Connect the repo, build command `npm run build`, output directory `.next`.
- **Other hosts**: `npm run build` then `npm run start`, or use static export if you switch to it.

Note the **production URL** (e.g. `https://iqearners.com`). You will use it for the app.

---

## 2. One-time setup for Android & iOS apps

From the **nextjs** folder:

```bash
cd nextjs
npm install
```

Set your production URL and add native projects:

```bash
# Optional: set URL for the app to load (defaults to https://your-domain.com in config)
set CAPACITOR_APP_URL=https://iqearners.com    # Windows
export CAPACITOR_APP_URL=https://iqearners.com # macOS/Linux

npx cap add android
npx cap add ios
```

Edit **capacitor.config.ts** and set `APP_URL` (or keep using `CAPACITOR_APP_URL` when running `cap sync`) to your real production URL so the app loads your site.

---

## 3. Build the Android app (Play Store)

1. Sync the project:
   ```bash
   npm run cap:sync
   ```
   Or with a custom URL:
   ```bash
   set CAPACITOR_APP_URL=https://iqearners.com && npx cap sync
   ```

2. Open in Android Studio and build a release bundle (AAB) for Play Store:
   ```bash
   npm run cap:open:android
   ```
   In Android Studio: **Build → Generate Signed Bundle / APK** → choose **Android App Bundle**, create or use a keystore, then build.

3. Upload the `.aab` in [Google Play Console](https://play.google.com/console). Fill in store listing, screenshots, and policy forms as required.

---

## 4. Build the iOS app (App Store)

1. You need a **Mac** with **Xcode** and an **Apple Developer** account.

2. Sync and open the iOS project:
   ```bash
   npm run cap:sync
   npm run cap:open:ios
   ```

3. In Xcode: select your team, set the bundle identifier (e.g. `com.iqearners.app`), then **Product → Archive**. Use **Distribute App** to upload to App Store Connect.

4. In [App Store Connect](https://appstoreconnect.apple.com) add the new app, fill in metadata and screenshots, and submit for review.

---

## 5. PWA (install from browser)

Your site is already a **Progressive Web App**:

- **manifest**: `name`, `short_name`, `icons`, `start_url`, `display: standalone`
- **Service worker**: `/sw.js` for caching and (optional) push
- **Install prompt**: “Install IQ Earners” is shown on supported browsers

Users can **Add to Home Screen** from Chrome/Safari/Edge and use the site like an app without going through the stores. For **store distribution** (Play Store / App Store), use the Capacitor steps above.

---

## 6. Summary

| Target           | How |
|------------------|-----|
| **Website**      | Deploy Next.js (e.g. Vercel) as you do now. |
| **PWA**          | Same deployment; users install from the browser. |
| **Play Store**   | `cap add android` → set production URL → build AAB in Android Studio → upload to Play Console. |
| **App Store**    | `cap add ios` → set production URL → archive in Xcode → upload to App Store Connect. |

After you change the site, redeploy the **website**. The Android and iOS apps will show the update automatically the next time users open them (they load the live URL). If you change app metadata (e.g. app name or bundle id), update **capacitor.config.ts** and run `npm run cap:sync`, then rebuild and re-upload to the stores.
