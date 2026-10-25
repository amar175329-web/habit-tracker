import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/storage'
import App from './App.tsx'

// Pre-mount clean slate check: if purge key not set, immediately and synchronously wipe localStorage & sessionStorage
const PURGE_KEY = "habittracker_fresh_clean_v11";
if (typeof window !== "undefined" && window.localStorage && !window.localStorage.getItem(PURGE_KEY)) {
  const theme = window.localStorage.getItem("theme");
  window.localStorage.clear();
  if (theme) window.localStorage.setItem("theme", theme);
  window.localStorage.setItem(PURGE_KEY, "true");
  try {
    window.sessionStorage.clear();
  } catch {}
}

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

