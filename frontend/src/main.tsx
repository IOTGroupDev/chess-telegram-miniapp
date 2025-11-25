import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/telegram-app.css'
import './styles/telegram-buttons.css'
import App from './App.tsx'

// Declare Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

// Wait for Telegram WebApp SDK to be ready before rendering React app
async function initApp() {
  console.log('[Init] Starting app initialization...');

  // Wait for Telegram SDK to be available
  if (window.Telegram?.WebApp) {
    console.log('[Init] Telegram SDK found, expanding and preparing...');

    // CRITICAL: Call these BEFORE rendering React
    window.Telegram.WebApp.expand();
    window.Telegram.WebApp.ready();

    console.log('[Init] Telegram SDK ready, platform:', window.Telegram.WebApp.platform);
  } else {
    console.log('[Init] Telegram SDK not found, running in development mode');
  }

  // Small delay to ensure Telegram SDK is fully initialized
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('[Init] Rendering React app...');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  console.log('[Init] React app rendered');
}

// Start initialization
initApp().catch(error => {
  console.error('[Init] Failed to initialize app:', error);
});
