import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bidaman.serenityclient',
  appName: 'Serenity',
  webDir: 'dist',
  server: {
    // During development, point to the Vite dev server
    // Comment this out for production builds
    url: 'http://localhost:5173',
    cleartext: true,
  },
};

export default config;
