import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/storage'
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

// Immediate frame-0 paint: render React synchronously so Today screen loads with 0ms delay
const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

