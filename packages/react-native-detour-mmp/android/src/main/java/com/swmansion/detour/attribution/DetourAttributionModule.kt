package com.swmansion.detour.attribution

import android.content.Context
import android.net.Uri
import android.util.Log
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import com.google.android.gms.appset.AppSet
import com.google.android.gms.appset.AppSetIdInfo
import com.google.android.gms.tasks.Tasks
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class DetourAttributionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DetourAttribution")

    // PROVISIONAL: Meta's sample reads only the first app it finds. Each app keeps its own last
    // touch, so all are read and the latest one wins, as the last touch before the install.
    // Each query can start a Meta app that is not running, so the apps are asked at once to stay
    // within the core SDK's 2 s limit. With no touch found, a read that failed rejects, so the core
    // SDK reads again on a later launch; an app that is missing or has nothing answers null.
    AsyncFunction("metaInstallReferrer") Coroutine { facebookAppId: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val reads = coroutineScope {
        MetaApp.entries
          .map { app -> async(Dispatchers.IO) { readMetaReferrer(context, app, facebookAppId) } }
          .awaitAll()
      }
      reads.mapNotNull { it.getOrNull() }.maxByOrNull { it["actual_timestamp"] as Long }
        ?: reads.firstNotNullOfOrNull { it.exceptionOrNull() }?.let { throw it }
    }

    // Blocks while it binds to Google Play services, so it runs off the JS thread.
    AsyncFunction("advertisingId") Coroutine { ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      withContext(Dispatchers.IO) { readAdvertisingId(context) }
    }

    AsyncFunction("appSetId") Coroutine { ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      withContext(Dispatchers.IO) { readAppSetId(context) }
    }
  }
}

private const val ZERO_ADVERTISING_ID = "00000000-0000-0000-0000-000000000000"

// The Google libraries are added by the app, so each read checks for its own first.
private fun hasClass(name: String) = runCatching { Class.forName(name) }.isSuccess

private val hasAdvertisingIdLibrary by lazy {
  hasClass("com.google.android.gms.ads.identifier.AdvertisingIdClient")
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
// is nothing to read (null), and that is not an error. An exception is: the Meta app's process can
// die during the query.
private fun readMetaReferrer(
  context: Context,
  app: MetaApp,
  facebookAppId: String,
): Result<Map<String, Any>?> = runCatching {
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
}.onFailure { e ->
  Log.d("Detour", "[Detour:ATTRIBUTION] No Meta Install Referrer from ${app.sourceApp}: ${e.message}")
}

private val hasAppSetLibrary by lazy { hasClass("com.google.android.gms.appset.AppSet") }

// Null without play-services-appset. Throws when Play services fails or takes longer than 2 s, so
// the promise rejects and the core SDK keeps the ID the server has.
private fun readAppSetId(context: Context): Map<String, String>? {
  if (!hasAppSetLibrary) return null
  // With a limit: a Play services that never answers would block an IO thread for good.
  val info = Tasks.await(AppSet.getClient(context).appSetIdInfo, 2, TimeUnit.SECONDS)
  val scope = if (info.scope == AppSetIdInfo.SCOPE_DEVELOPER) "developer" else "app"
  return info.id.takeIf { it.isNotBlank() }?.let { mapOf("id" to it.lowercase(), "scope" to scope) }
}
