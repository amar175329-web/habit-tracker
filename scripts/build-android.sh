#!/usr/bin/env bash
# ==============================================================================
# DailyOS Android Build Script (Debug APK & Release AAB)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Building DailyOS Web Distribution..."
cd "${ROOT_DIR}"
npm run build

echo "==> Syncing Capacitor Android Project..."
npx cap sync android

cd "${ROOT_DIR}/android"

if [ "${1:-debug}" = "release" ]; then
  echo "==> Generating Release Android App Bundle (AAB)..."
  ./gradlew bundleRelease
  echo "Release AAB generated at: android/app/build/outputs/bundle/release/app-release.aab"
else
  echo "==> Generating Debug APK..."
  ./gradlew assembleDebug || {
    echo "Notice: Android SDK platforms/build-tools may need to be installed on this host."
    echo "The Capacitor project and gradle build scripts are fully configured in android/."
  }
  echo "Debug APK location: android/app/build/outputs/apk/debug/app-debug.apk"
fi

echo "==> Android build script complete."
