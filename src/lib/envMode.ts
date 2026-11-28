/**
 * Runtime build-mode flags.
 * When VITE_LOCAL_ONLY=true (e.g. shareable public PWA deployment),
 * all /api calls and server login/sync are disabled so every user's data
 * stays 100% isolated in their own browser's IndexedDB.
 */
export const IS_LOCAL_ONLY: boolean =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.VITE_LOCAL_ONLY === "true";
