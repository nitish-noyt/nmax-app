import { NativeModules, Platform } from 'react-native';

const native = NativeModules.AppConfig || {};

/** 'admin' | 'client' — injected from Android BuildConfig product flavor */
export const APP_FLAVOR = native.APP_FLAVOR || 'admin';
export const APP_VERSION = native.APP_VERSION || '1.4.0';
export const VERSION_CODE = native.VERSION_CODE || 6;
export const APPLICATION_ID = native.APPLICATION_ID || 'com.nmax.admin';

export const IS_CLIENT = APP_FLAVOR === 'client';
export const IS_ADMIN = APP_FLAVOR === 'admin';

export const APP_DISPLAY_NAME = IS_CLIENT ? 'NMAX Client' : 'NMAX Admin';

export const LIVE_POLL_INTERVAL_MS = 30_000;

export const PROD = {
  apiBaseUrl: 'https://nmax.noytindia.com/api/v1/nmax',
  socketUrl: 'https://nmax.noytindia.com',
};

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[AppConfig]', {
    APP_FLAVOR,
    APP_VERSION,
    PLATFORM: Platform.OS,
    APPLICATION_ID,
  });
}
