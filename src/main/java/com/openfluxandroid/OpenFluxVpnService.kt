package com.openfluxandroid

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

class OpenFluxVpnService : VpnService(), NativePacketSink {
  companion object {
    const val ACTION_START = "com.openfluxandroid.action.START"
    const val ACTION_STOP = "com.openfluxandroid.action.STOP"
    const val ACTION_STATUS = "com.openfluxandroid.action.STATUS"
    const val EXTRA_STATUS = "status"
    private const val CHANNEL_ID = "openflux_vpn"
    private const val NOTIFICATION_ID = 1001

    fun start(context: Context, configJson: String) {
      ConfigStore.saveConfig(context, configJson)
      ContextCompat.startForegroundService(context, Intent(context, OpenFluxVpnService::class.java).apply {
        action = ACTION_START
      })
    }

    fun stop(context: Context) {
      context.startService(Intent(context, OpenFluxVpnService::class.java).apply { action = ACTION_STOP })
    }
  }

  private val ioExecutor = Executors.newSingleThreadExecutor()
  private val statusExecutor = Executors.newSingleThreadScheduledExecutor()
  private var statusTicker: ScheduledFuture<*>? = null
  private var tun: ParcelFileDescriptor? = null
  private var tunOutput: FileOutputStream? = null
  @Volatile private var packetLoopRunning = false
  private var killSwitchEnabled = false
  private val packetWriteLock = Any()

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> stopVpn()
      ACTION_START, null -> startVpn(ConfigStore.config(this))
    }
    return START_STICKY
  }

  private fun startVpn(configJson: String?) {
    if (packetLoopRunning) {
      // A kill-switch startup failure keeps the TUN up intentionally. A new
      // Connect request is an explicit retry, so tear down that blocked state.
      if (OpenFluxNative.status().contains("\"ERROR\"")) stopVpn() else return
    }
    if (configJson.isNullOrBlank()) {
      publish("{\"state\":\"ERROR\",\"message\":\"VPN configuration is missing\"}")
      stopSelf()
      return
    }
    killSwitchEnabled = runCatching { JSONObject(configJson).optBoolean("killSwitch", false) }.getOrDefault(false)
    createNotificationChannel()
    promote("Connecting to OpenFlux")
    try {
      OpenFluxNative.initialize(this)
      val descriptor = Builder()
        .setSession("OpenFlux")
        .setMtu(1500)
        .addAddress("10.10.10.2", 24)
        .addRoute("0.0.0.0", 0)
        // A blocking descriptor avoids busy-waiting in the packet reader.
        .setBlocking(true)
        .establish() ?: throw IllegalStateException("Android could not establish the VPN interface")
      tun = descriptor
      tunOutput = FileOutputStream(descriptor.fileDescriptor)
      packetLoopRunning = true
      val startupError = OpenFluxNative.start(configJson)
      if (startupError != null) throw IllegalStateException(startupError)
      startPacketReader(descriptor)
      statusTicker = statusExecutor.scheduleAtFixedRate({ publish(OpenFluxNative.status()) }, 0, 750, TimeUnit.MILLISECONDS)
    } catch (error: Exception) {
      publish("{\"state\":\"ERROR\",\"message\":\"${safeMessage(error)}\"}")
      if (killSwitchEnabled && tun != null) {
        // Keep the all-traffic TUN route established: unsupported packets and
        // packets without a live transport remain blocked instead of falling
        // back onto the physical network. The user can explicitly Disconnect
        // or retry Connect to remove this state.
        promote("OpenFlux VPN error — traffic blocked")
      } else {
        closeTun()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
    }
  }

  private fun startPacketReader(descriptor: ParcelFileDescriptor) {
    ioExecutor.execute {
      val input = FileInputStream(descriptor.fileDescriptor)
      val buffer = ByteArray(65535)
      try {
        while (packetLoopRunning) {
          val read = input.read(buffer)
          if (read <= 0) continue
          if (PacketValidator.isSupported(buffer, read)) {
            // Go copies this packet synchronously; no user traffic is logged.
            OpenFluxNative.writePacket(buffer.copyOf(read))
          }
        }
      } catch (_: Exception) {
        if (packetLoopRunning) publish("{\"state\":\"ERROR\",\"message\":\"VPN interface closed unexpectedly\"}")
      } finally {
        input.close()
      }
    }
  }

  override fun onPacket(packet: ByteArray) {
    if (!packetLoopRunning || !PacketValidator.isSupported(packet, packet.size)) return
    synchronized(packetWriteLock) {
      try {
        tunOutput?.write(packet)
      } catch (_: Exception) {
        // The reader/status path reports an actionable service failure; never
        // expose payload data through an exception or log statement.
      }
    }
  }

  // Called from the Go net.Dialer Control hook through JNI before connect().
  override fun protectSocket(fd: Int): Boolean = protect(fd)

  private fun stopVpn() {
    packetLoopRunning = false
    statusTicker?.cancel(true)
    statusTicker = null
    publish("{\"state\":\"DISCONNECTING\",\"message\":\"Closing transport\"}")
    OpenFluxNative.stop()
    closeTun()
    publish("{\"state\":\"DISCONNECTED\",\"message\":\"VPN is off\",\"uploadBytes\":0,\"downloadBytes\":0}")
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun closeTun() {
    packetLoopRunning = false
    synchronized(packetWriteLock) {
      runCatching { tunOutput?.close() }
      tunOutput = null
    }
    runCatching { tun?.close() }
    tun = null
  }

  override fun onRevoke() = stopVpn()

  override fun onDestroy() {
    if (packetLoopRunning) stopVpn()
    ioExecutor.shutdownNow()
    statusExecutor.shutdownNow()
    super.onDestroy()
  }

  private fun publish(status: String) {
    ConfigStore.saveStatus(this, status)
    sendBroadcast(Intent(ACTION_STATUS).setPackage(packageName).putExtra(EXTRA_STATUS, status))
    val connected = status.contains("\"CONNECTED\"")
    val failed = status.contains("\"ERROR\"")
    promote(
      when {
        connected -> "OpenFlux VPN connected"
        failed && killSwitchEnabled -> "OpenFlux VPN error — traffic blocked"
        failed -> "OpenFlux VPN error"
        else -> "OpenFlux VPN connecting"
      },
    )
  }

  private fun promote(message: String) {
    createNotificationChannel()
    val notification = Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.openflux_vpn_status)
      .setContentTitle("OpenFlux")
      .setContentText(message)
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      (getSystemService(NotificationManager::class.java)).createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "OpenFlux VPN", NotificationManager.IMPORTANCE_LOW),
      )
    }
  }

  private fun safeMessage(error: Exception): String = when {
    error.message?.contains("valid Yandex") == true -> "Enter a valid Yandex document URL"
    error.message?.contains("MAX") == true -> "Check your MAX credentials"
    error.message?.contains("protect") == true -> "Android could not protect the transport connection"
    else -> "OpenFlux could not start. Check configuration and network access."
  }
}
