package com.openfluxandroid

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Stores secrets outside JS storage; values are encrypted with an Android
 * Keystore-backed key and are never added to service logs or notifications. */
object ConfigStore {
  private const val STORE = "openflux.secure.config"
  private const val CONFIG = "vpn_config"
  private const val STATUS = "vpn_status"

  private fun preferences(context: Context) = EncryptedSharedPreferences.create(
    context,
    STORE,
    MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
  )

  fun saveConfig(context: Context, config: String) {
    preferences(context).edit().putString(CONFIG, config).apply()
  }

  fun config(context: Context): String? = preferences(context).getString(CONFIG, null)

  fun saveStatus(context: Context, status: String) {
    preferences(context).edit().putString(STATUS, status).apply()
  }

  fun status(context: Context): String = preferences(context).getString(STATUS, null)
    ?: "{\"state\":\"DISCONNECTED\",\"message\":\"VPN is off\",\"uploadBytes\":0,\"downloadBytes\":0}"
}
