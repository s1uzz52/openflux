package com.openfluxandroid

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.VpnService
import android.os.Build
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

class OpenFluxVpnModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ActivityEventListener {
  companion object {
    private const val VPN_PERMISSION_REQUEST = 4182
    private const val EVENT_STATUS = "OpenFluxVpnStatus"
  }

  private var permissionPromise: Promise? = null
  private val statusReceiver = object : BroadcastReceiver() {
    override fun onReceive(receiverContext: Context, intent: Intent) {
      intent.getStringExtra(OpenFluxVpnService.EXTRA_STATUS)?.let(::emitStatus)
    }
  }

  init {
    context.addActivityEventListener(this)
    val filter = IntentFilter(OpenFluxVpnService.ACTION_STATUS)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(statusReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      context.registerReceiver(statusReceiver, filter)
    }
  }

  override fun getName(): String = "OpenFluxVpn"

  @ReactMethod
  fun requestPermission(promise: Promise) {
    val activity: Activity? = context.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Open OpenFlux and try again to grant VPN permission.")
      return
    }
    val permissionIntent = VpnService.prepare(activity)
    if (permissionIntent == null) {
      promise.resolve(true)
      return
    }
    permissionPromise = promise
    activity.startActivityForResult(permissionIntent, VPN_PERMISSION_REQUEST)
  }

  @ReactMethod
  fun start(configJson: String, promise: Promise) {
    try {
      JSONObject(configJson) // reject malformed data before starting a service
      OpenFluxVpnService.start(context, configJson)
      promise.resolve(null)
    } catch (_: Exception) {
      promise.reject("INVALID_CONFIG", "The VPN configuration is invalid.")
    }
  }

  @ReactMethod
  fun saveConfig(configJson: String, promise: Promise) {
    try {
      JSONObject(configJson)
      ConfigStore.saveConfig(context, configJson)
      promise.resolve(null)
    } catch (_: Exception) {
      promise.reject("INVALID_CONFIG", "The VPN configuration is invalid.")
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    OpenFluxVpnService.stop(context)
    promise.resolve(null)
  }

  @ReactMethod
  fun getStatus(promise: Promise) = promise.resolve(ConfigStore.status(context))

  @ReactMethod
  fun getSavedConfig(promise: Promise) = promise.resolve(ConfigStore.config(context))

  // Required by React Native's NativeEventEmitter contract.
  @ReactMethod fun addListener(eventName: String) = Unit
  @ReactMethod fun removeListeners(count: Double) = Unit

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == VPN_PERMISSION_REQUEST) {
      if (resultCode == Activity.RESULT_OK) permissionPromise?.resolve(true)
      else permissionPromise?.resolve(false)
      permissionPromise = null
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun emitStatus(status: String) {
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(EVENT_STATUS, status)
  }

  override fun invalidate() {
    runCatching { context.unregisterReceiver(statusReceiver) }
    super.invalidate()
  }
}

class OpenFluxVpnPackage : com.facebook.react.ReactPackage {
  @Deprecated("ReactPackage.createNativeModules is retained for the stable React Native bridge.")
  override fun createNativeModules(reactContext: ReactApplicationContext) =
    listOf(OpenFluxVpnModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext) = emptyList<com.facebook.react.uimanager.ViewManager<*, *>>()
}
