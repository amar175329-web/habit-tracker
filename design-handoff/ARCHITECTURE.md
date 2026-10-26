# Architecture: local-first, optional user cloud, Play Store ready

## Stack (keep what exists)
React 19 + Vite + TypeScript + Tailwind v4, wrapped with **Capacitor** for Android. Remove the Hono/Vercel API from the app path: the Play Store build talks only to the phone DB and (optionally) the user's own Turso.

## Data
- Primary store on the phone: **IndexedDB via Dexie**. Tables: habits(id,name,icon,goalDays,sort,isActive,createdAt), habit_logs(id,habitId,date,state,updatedAt), sleep_logs(date,bedAt,wakeAt,durationMin,updatedAt), mood_logs(date,score,emotions[],updatedAt), reflections(date,content,updatedAt,lockedAt), settings(key,value), outbox(id,table,op,row,ts).
- Habit Tracker starts with **zero habits**. DailyOS seeds its 5 habits (Workout, Study, AI, Book Listening, Video).
- Every write: update Dexie first, then push to `outbox`.

## Optional cloud (user-provided Turso)
- Data & Backup screen (data-backup.html): user pastes Database URL + Auth Token, Save. App calls Turso over HTTPS (`POST {url}/v2/pipeline`, Bearer token) from the WebView; no server needed.
- Verify = run `SELECT 1`. Show Verified (green) or Unverified (red). After saving, never show the token again (store in Capacitor Preferences; prefer a Keystore-backed secure-storage plugin).
- Sync: replay `outbox` to Turso when online; last-write-wins by `updatedAt`. Cloud and local both hold the data.
- Restore: if local DB is empty and a key is entered, pull all tables from Turso into Dexie.
- Neon is not planned: its browser access needs a server-side proxy. Turso only for v1.

## Backup file and reinstall (IMPORTANT, researched)
Uninstalling deletes the app's own storage (IndexedDB, Preferences). A JSON file written to shared Documents/Downloads **survives uninstall, but the reinstalled app is a new app and cannot read it by path** (Android scoped storage; Capacitor `Documents` is legacy on Android 11+). So:
1. Auto-backup: write `dailyos-backup-YYYY-MM-DD.json` through MediaStore/Share to Documents (new file per backup).
2. On first launch with an empty DB show "Restore": (a) enter cloud key, or (b) **Restore from file** using the system file picker (ACTION_OPEN_DOCUMENT). The user taps the backup file once.
3. Also enable Android Auto Backup (Google Drive) for app data (`android:allowBackup="true"` + backup rules).
Do NOT promise automatic file discovery after reinstall.

## Export/Import JSON
Version field + all tables. Import validates version, merges by (table, primary key), newest `updatedAt` wins, then rebuilds outbox.

## Security cleanup (do first)
Remove committed `.env.local` (live VERCEL_OIDC_TOKEN) from git history and rotate it. Delete the hardcoded JWT fallback secret. No secrets in client code.

## Play Store
Capacitor `android/` project, package id e.g. `app.dailyos.habits`, adaptive icon, splash, `targetSdk` per current Play requirement, release **AAB** (not APK) signed with an upload key (keep the keystore safe), versionCode increments, privacy policy URL, Data safety form (data stays on device; optional user-supplied cloud), safe-area handling, hide 3-finger-gesture overlaps. APK only for local testing. Developer account is paid and created later.

## What happens when the app is deleted (plain answer)
- App data (IndexedDB) is deleted by Android on uninstall. There is no way around that.
- Cloud key saved earlier: reinstall, paste the same Turso URL and token, everything comes back.
- Backup file in Documents/Downloads: it survives the uninstall, but the new install cannot see it by itself. Tap "Restore from file" and pick it once.
- Google Drive Auto Backup of app data (allowBackup=true): restores by itself only for installs through Play Store or phone setup, not for a side-loaded test APK, so never rely on it.
- Nothing saved anywhere: the data is gone. That is why the app must remind the user (design rule 23) and the first-run screen of a reinstalled app must offer Restore (cloud key or file) before it offers a fresh start.
