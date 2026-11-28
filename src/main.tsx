import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/storage'
import App from './App.tsx'

// Immediate frame-0 paint: render React synchronously so Today screen loads with 0ms delay
const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA service worker for offline use on web browsers (skip inside native Capacitor)
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  !(window as any).Capacitor?.isNativePlatform?.()
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
