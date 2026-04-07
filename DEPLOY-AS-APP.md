# Deploy IQ Earners as Website + App (Play Store & App Store)

IQ Earners is built as a **Progressive Web App (PWA)**. You can:

1. **Use it as a website** — deploy to Vercel, Netlify, or any host (same codebase).
2. **Install as an app** — users add to home screen (Android/iOS) for an app-like experience.
3. **Publish to stores** — wrap the same website in a native shell and submit to Google Play and Apple App Store.

---

## 1. Website deployment (unchanged)

Deploy the Next.js app as you do now:

- **Vercel:** `vercel` or connect the repo.
- **Other hosts:** `npm run build` then `npm run start`, or use static export if your setup allows.

Your live URL (e.g. `https://iqearners.com`) is the **single source of truth** for both web and app.

---

## 2. PWA: install as app (already set up)

The site is already a PWA:

- **Manifest:** `src/app/manifest.ts` (name, icons, theme, standalone display).
- **Service worker:** `public/sw.js` (caching, offline shell, push).
- **Registration:** `PwaRegister` in the root layout registers the SW.
- **Install prompt:** `InstallPrompt` shows “Install app” on supported browsers.

**User experience:**

- **Android (Chrome):** “Add to Home screen” or the in-browser install banner → app icon, opens fullscreen.
- **iOS (Safari):** Share → “Add to Home Screen” → app icon, opens in standalone mode (no Safari UI).

No extra build step. Deploy the website and the PWA works from the same URL.

---

## 3. Google Play Store (Android)

Two common options: **TWA** (Trusted Web Activity) or **Capacitor**.

### Option A: TWA (recommended for “wrap the website”)

TWA is a minimal Android app that shows your PWA in a Chrome Custom Tab (no browser UI). Google allows publishing PWAs as TWA.

**Steps:**

1. **Create a TWA project** (one-time):
   - Use [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) or [PWA Builder](https://www.pwabuilder.com/):
     - Go to [pwabuilder.com](https://www.pwabuilder.com/), enter your live URL (e.g. `https://iqearners.com`).
     - Run the builder; it will generate an Android project (TWA).
   - Or CLI: `npx @bubblewrap/cli init` and set your **start URL** to your production URL.

2. **Configure:**
   - **Application ID:** e.g. `com.iqearners.app` (must be unique).
   - **Signing key:** create a keystore for release builds.
   - **Digital Asset Links:** host `/.well-known/assetlinks.json` on your domain so the TWA is trusted (PWA Builder explains this).

3. **Build and publish:**
   - Build the Android app (e.g. `./gradlew bundleRelease`).
   - Upload the AAB to [Google Play Console](https://play.google.com/console).
   - Fill store listing (description, screenshots, privacy policy). The “app” is your website running inside TWA.

**Pros:** One codebase (website); updates are instant (no app release for content).  
**Cons:** Still depends on your website being up; some store policies require the app to add clear value over the web.

### Option B: Capacitor (WebView app)

Capacitor wraps your site in a native WebView. You can point it at your **live URL** so the app is just a shell.

**Steps:**

1. **Install Capacitor** (in this repo or a separate wrapper repo):

   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "IQ Earners" "com.iqearners.app"
   ```

2. **Point to your website:**

   In `capacitor.config.ts`:

   ```ts
   import { CapacitorConfig } from '@capacitor/cli';

   const config: CapacitorConfig = {
     appId: 'com.iqearners.app',
     appName: 'IQ Earners',
     webDir: 'out',   // not used when using server url
     server: {
       url: 'https://your-domain.com',  // your live website
       cleartext: true
     }
   };
   export default config;
   ```

3. **Add Android and build:**

   ```bash
   npx cap add android
   npx cap sync
   npx cap open android
   ```

   In Android Studio: build signed bundle (AAB) and upload to Play Console.

4. **Store listing:** Same as TWA (screenshots, description, privacy policy).

---

## 4. Apple App Store (iOS)

Apple does not accept “PWA-only” submissions. You need a **native wrapper**. Capacitor is the usual choice.

**Steps:**

1. **Capacitor** (same as Android Option B):

   ```bash
   npx cap add ios
   npx cap sync
   npx cap open ios
   ```

2. **Xcode:**
   - Open the `ios` project.
   - Set **Bundle ID** (e.g. `com.iqearners.app`), **Team**, and **Signing**.
   - Use the same `server.url` in `capacitor.config.ts` so the app loads your live site.

3. **App Store Connect:**
   - Create an app record.
   - Upload the build (Archive → Distribute App).
   - Provide screenshots (e.g. 6.5" iPhone), description, privacy policy, etc.

**Notes:**

- Apple may ask what value the app adds over the website; “native install, push notifications, home screen, fullscreen experience” is a valid answer.
- If you use in-app payments (e.g. for entry fee), check Apple’s guidelines; often you can keep using your existing web payment (UPI) and describe it in the listing.

---

## 5. One codebase, three surfaces

| Surface        | How                                      |
|----------------|------------------------------------------|
| **Website**    | Deploy Next.js to your domain as today.  |
| **PWA install** | Same URL; users use “Add to Home Screen”. |
| **Play Store** | TWA or Capacitor pointing at that URL.   |
| **App Store**  | Capacitor iOS app pointing at that URL.  |

**Updates:** Change the website → web and “Add to Home Screen” users get updates immediately. Store apps (TWA/Capacitor) will show the updated site on next open unless you change the shell (then you need a new store build).

---

## 6. Checklist before store submission

- [ ] **HTTPS** and stable production URL.
- [ ] **Privacy policy** URL (required by both stores).
- [ ] **Icons:** 192×192 and 512×512 (you have these in `public/` and in `manifest.ts`).
- [ ] **Screenshots:** Phone and (for Play) optionally tablet; use a real device or emulator.
- [ ] **TWA only:** `assetlinks.json` on your domain if using TWA.
- [ ] **Capacitor:** `server.url` in `capacitor.config.ts` set to your production URL.

---

## 7. Optional: Capacitor config in this repo

If you want to keep the app wrapper inside this repo, add a minimal Capacitor config and ignore the generated native projects in git until you are ready to build:

1. Create `capacitor.config.ts` in the **nextjs** folder (see Option B above) with `server.url` = your production URL.
2. Run `npx cap add android` and `npx cap add ios` when you are ready to build.
3. Add `android/` and `ios/` to `.gitignore` if you prefer not to commit them (you can generate them again with `cap add`).

This keeps one repo for “website + app wrapper” and still lets you deploy the **website** exactly as you do today while preparing for Play and App Store.
