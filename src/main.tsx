import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/storage'
import { clearAllData } from './lib/db'
import App from './App.tsx'

// Ensure PWA service worker updates and activates fresh bundle
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        reg.update().catch(() => {});
      }
    });
  });
}

// Pre-mount clean slate check: wipe all Dexie tables, localStorage, and sessionStorage before React renders
async function initApp() {
  const PURGE_KEY = "habittracker_clean_restart_v12";
  if (typeof window !== "undefined" && window.localStorage && !window.localStorage.getItem(PURGE_KEY)) {
    try {
      await clearAllData();
    } catch {}
    const theme = window.localStorage.getItem("theme");
    window.localStorage.clear();
    if (theme) window.localStorage.setItem("theme", theme);
    window.localStorage.setItem(PURGE_KEY, "true");
    try {
      window.sessionStorage.clear();
    } catch {}
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

initApp();

