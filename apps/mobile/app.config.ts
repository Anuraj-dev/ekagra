import type { ExpoConfig } from 'expo/config';

/**
 * Expo app config. Env is read from EXPO_PUBLIC_* (inlined by Expo at build time)
 * and also surfaced through `extra` for non-public access via expo-constants.
 * Expo Go-compatible: no custom native modules; plugins here are no-ops in Expo Go.
 */
const config: ExpoConfig = {
  name: 'Ekagra',
  slug: 'ekagra',
  version: '0.1.3',
  orientation: 'portrait',
  scheme: 'ekagra',
  userInterfaceStyle: 'dark',
  backgroundColor: '#0E0F12',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    backgroundColor: '#0A0B0E',
    resizeMode: 'contain',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    backgroundColor: '#0E0F12',
  },
  android: {
    package: 'dev.anuraj.ekagra',
    // Lets the in-app updater hand a downloaded APK to the system installer.
    permissions: ['REQUEST_INSTALL_PACKAGES'],
    backgroundColor: '#0E0F12',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0B0E',
    },
  },
  plugins: ['expo-font', 'expo-notifications'],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
  },
};

export default config;
