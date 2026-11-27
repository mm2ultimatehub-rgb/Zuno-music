import { createRoot } from 'react-dom/client';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';
import { supabase } from './utils/supabaseClient';

createRoot(document.getElementById('root')!).render(<App />);

async function handleNativeAuthUrl(rawUrl: string): Promise<void> {
  if (!supabase) return;
  try {
    const incoming = new URL(rawUrl);
    if (incoming.protocol !== 'zuno:' || incoming.hostname !== 'auth' || incoming.pathname !== '/callback') {
      return;
    }

    const query = new URLSearchParams(incoming.search);
    const hash = new URLSearchParams(incoming.hash.replace(/^#/, ''));
    const code = query.get('code');
    const accessToken = hash.get('access_token') || query.get('access_token');
    const refreshToken = hash.get('refresh_token') || query.get('refresh_token');

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
    } else {
      const reason = query.get('error_description') || query.get('error');
      if (reason) throw new Error(reason);
      return;
    }

    if (query.get('type') === 'recovery' || hash.get('type') === 'recovery') {
      window.dispatchEvent(new Event('zuno:password-recovery'));
    }
  } catch (error) {
    console.error('ZUNO native authentication callback failed:', error);
  }
}

// Capacitor handles Supabase confirmation and password-recovery links through zuno://auth/callback.
if (Capacitor.isNativePlatform()) {
  void NativeApp.addListener('appUrlOpen', ({ url }) => {
    void handleNativeAuthUrl(url);
  });
  void NativeApp.getLaunchUrl().then((launch) => {
    if (launch?.url) void handleNativeAuthUrl(launch.url);
  });
}

// Keep the browser PWA offline cache out of native WebViews and Tauri desktop.
const isTauri = window.location.protocol === 'tauri:';
if (!Capacitor.isNativePlatform() && !isTauri && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('ZUNO service worker registration failed:', error);
    });
  });
}
