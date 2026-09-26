import { NativeModules, Platform } from 'react-native';

const native = NativeModules.AppConfig || {};

/** 'admin' | 'client' — injected from Android BuildConfig product flavor */
export const APP_FLAVOR = native.APP_FLAVOR || 'admin';
/** 'dev' | 'prod' — which server this build talks to */
export const APP_ENV = native.APP_ENV || 'prod';
export const APP_VERSION = native.APP_VERSION || '1.5.4';
export const VERSION_CODE = native.VERSION_CODE || 12;
export const APPLICATION_ID = native.APPLICATION_ID || 'com.nmax.admin';

export const IS_CLIENT = APP_FLAVOR === 'client';
export const IS_ADMIN = APP_FLAVOR === 'admin';
export const IS_DEV_ENV = APP_ENV === 'dev';

export const APP_DISPLAY_NAME = `${IS_CLIENT ? 'NMAX Client' : 'NMAX Admin'}${
  IS_DEV_ENV ? ' Dev' : ''
}`;

export const LIVE_POLL_INTERVAL_MS = 30_000;

/**
 * Server origin comes from the build flavor (BuildConfig.API_BASE_URL), so a
 * dev and a prod APK are produced from the same source with no file edits.
 */
const BASE_URL = native.API_BASE_URL || 'https://nmax.noytindia.com';

export const SERVER = {
  baseUrl: BASE_URL,
  apiBaseUrl: `${BASE_URL}/api/v1/nmax`,
  socketUrl: BASE_URL,
};

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[AppConfig]', {
    APP_FLAVOR,
    APP_ENV,
    APP_VERSION,
    BASE_URL,
    PLATFORM: Platform.OS,
    APPLICATION_ID,
  });
}
