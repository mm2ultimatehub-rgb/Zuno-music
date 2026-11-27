import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zuno.music',
  appName: 'ZUNO Music',
  webDir: 'dist',
  server: {
    // A stable HTTPS origin keeps local assets and browser APIs consistent in Android WebView.
    androidScheme: 'https',
  },
};

export default config;
