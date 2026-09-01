package com.nmax

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class AppConfigModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppConfig"

  override fun getConstants(): MutableMap<String, Any> =
      hashMapOf(
          "APP_FLAVOR" to BuildConfig.APP_FLAVOR,
          "APP_VERSION" to BuildConfig.VERSION_NAME,
          "VERSION_CODE" to BuildConfig.VERSION_CODE,
          "APPLICATION_ID" to BuildConfig.APPLICATION_ID,
      )
}
