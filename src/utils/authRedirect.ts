import { Capacitor } from '@capacitor/core';

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined'
    && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function isZunoNativeContainer(): boolean {
  return Capacitor.isNativePlatform() || isTauriRuntime();
}

export function getZunoAuthRedirectUrl(): string {
  return isZunoNativeContainer() ? 'zuno://auth/callback' : window.location.origin;
}
