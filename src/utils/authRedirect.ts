import { Capacitor } from '@capacitor/core';

export function getZunoAuthRedirectUrl(): string {
  return Capacitor.isNativePlatform() ? 'zuno://auth/callback' : window.location.origin;
}
