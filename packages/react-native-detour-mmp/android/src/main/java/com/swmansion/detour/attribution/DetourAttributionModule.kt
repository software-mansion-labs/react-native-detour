package com.swmansion.detour.attribution

import android.content.Context
import android.net.Uri
import android.util.Log
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext

class DetourAttributionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DetourAttribution")

    // PROVISIONAL: Meta's sample reads only the first app it finds. Each app keeps its own last
    // touch, so all are read and the latest one wins, as the last touch before the install.
    // Each query can start a Meta app that is not running, so the apps are asked at once to stay
    // within the core SDK's 2 s limit.
    AsyncFunction("metaInstallReferrer") Coroutine { facebookAppId: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      coroutineScope {
        MetaApp.entries
          .map { app -> async(Dispatchers.IO) { readMetaReferrer(context, app, facebookAppId) } }
          .awaitAll()
          .filterNotNull()
          .maxByOrNull { it["actual_timestamp"] as Long }
      }
    }

    // Blocks while it binds to Google Play services, so it runs off the JS thread.
    AsyncFunction("advertisingId") Coroutine { ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      withContext(Dispatchers.IO) { readAdvertisingId(context) }
    }
  }
}

private const val ZERO_ADVERTISING_ID = "00000000-0000-0000-0000-000000000000"

private val hasAdvertisingIdLibrary: Boolean by lazy {
  runCatching { Class.forName("com.google.android.gms.ads.identifier.AdvertisingIdClient") }.isSuccess
}

// Null without the library or after the user opted out of ads personalization (Android 12+ then
// gives zeros). Throws when Play services fails, so the promise rejects and the core SDK does not
// take it for an opt-out.
private fun readAdvertisingId(context: Context): String? {
  if (!hasAdvertisingIdLibrary) return null
  val info = AdvertisingIdClient.getAdvertisingIdInfo(context)
  if (info.isLimitAdTrackingEnabled) return null
  return info.id?.lowercase()?.takeIf { it.isNotBlank() && it != ZERO_ADVERTISING_ID }
}

private enum class MetaApp(val authority: String, val sourceApp: String) {
  FACEBOOK("com.facebook.katana.provider.InstallReferrerProvider", "facebook"),
  INSTAGRAM("com.instagram.contentprovider.InstallReferrerProvider", "instagram"),
  FACEBOOK_LITE("com.facebook.lite.provider.InstallReferrerProvider", "facebook_lite"),
}

// As Meta describes it: https://developers.facebook.com/documentation/app-ads/meta-install-referrer
// (read 19.11.2026). Without the app, a supported app version or the app's <queries> entries there
// is nothing to read, and that is not an error.
private fun readMetaReferrer(context: Context, app: MetaApp, facebookAppId: String): Map<String, Any>? = try {
  val uri = Uri.parse("content://${app.authority}/$facebookAppId")
  val projection = arrayOf("install_referrer", "is_ct", "actual_timestamp")
  context.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
    if (!cursor.moveToFirst()) return@use null
    val referrer = cursor.getString(cursor.getColumnIndexOrThrow("install_referrer"))
      ?.takeIf { it.isNotBlank() } ?: return@use null
    mapOf(
      "install_referrer" to referrer,
      "is_ct" to (cursor.getInt(cursor.getColumnIndexOrThrow("is_ct")) == 1),
      "actual_timestamp" to cursor.getLong(cursor.getColumnIndexOrThrow("actual_timestamp")),
      "source_app" to app.sourceApp,
    )
  }
} catch (e: Exception) {
  Log.d("Detour", "[Detour:ATTRIBUTION] No Meta Install Referrer from ${app.sourceApp}: ${e.message}")
  null
}
