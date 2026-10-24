# DailyOS — Play Store Data Safety & Submission Checklist

> **App ID:** `app.dailyos.habits`  
> **App Name:** `DailyOS — Own Your Every Day`  
> **Category:** Productivity / Health & Fitness  
> **Target SDK:** 34+ (Android 14 / 15)  

---

## 1. Google Play Data Safety Form Responses

### Data Collection & Sharing Overview
| Question | Response | Notes |
|---|---|---|
| Does your app collect or share user data? | **No** (or Yes, strictly on-device optional cloud) | Primary store is phone-only IndexedDB. |
| Is all data encrypted in transit? | **Yes** | Direct HTTPS TLS 1.3 to user's Turso cloud. |
| Do you provide a way for users to request data deletion? | **Yes** | Settings -> Danger Zone -> Reset All Logs or App Uninstall. |
| Does the app require account creation? | **No** | Zero login, zero mandatory signup. |

### Data Types Breakdown
- **Personal Info:** NONE collected or transmitted.
- **Financial Info:** NONE.
- **Health & Fitness:** Stored locally on phone only (sleep duration, habit progress).
- **Messages / Photos / Media:** NONE.
- **Location:** NONE.
- **Identifiers:** NONE (No advertising ID, no device fingerprinting).

---

## 2. Store Listing Assets & Copy

### App Title (max 30 characters)
`DailyOS — Own Your Every Day`

### Short Description (max 80 characters)
`Private, local-first habit tracker, sleep logger, and daily reflection journal.`

### Full Description
```
DailyOS is a calm, local-first companion to help you build consistent habits, maintain healthy sleep rhythms, and reflect on every day.

✨ LOCAL-FIRST & FULLY PRIVATE
Your habits, sleep logs, and reflections live exclusively on your device in local storage. There are no mandatory accounts, no ads, and zero third-party tracking.

🎯 SIGNATURE WEEKLY MOMENTUM
- Triple-ring momentum arch visualizing Habits, Sleep, and Mind progress.
- Flexible weekly goals: choose "Every day" or N days a week (rest days protect your streak!).
- 3-state habit cycle (Pending → Full → Half → Pending).

🌙 SLEEP DIAL & RHYTHMS
- Visual 24-hour circular sleep ring with bedtime and wake-up arcs.
- Track nights inside your 7 to 9 hour target without intrusive permissions.

🧘 MOOD & DAILY REFLECTION
- Five tactile mood orbs with customizable feeling tags.
- Daily reflection journal: write freely today; past entries lock permanently at midnight to capture honest, authentic memories.

☁️ OPTIONAL PERSONAL CLOUD & BACKUPS
- Connect your own free Turso database if you wish to sync across devices.
- One-tap JSON export and import for seamless backups.
```

---

## 3. Release & Signing Commands

```bash
# 1. Build web distribution
npm run build

# 2. Sync native Android project
npx cap sync android

# 3. Build signed release bundle (AAB)
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`
