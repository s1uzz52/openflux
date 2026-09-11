package com.openfluxandroid

/** JNI surface for the Go packet core. It is deliberately small: lifecycle,
 * status, and raw IP-packet ingress. Egress is delivered to [NativePacketSink]. */
interface NativePacketSink {
  fun onPacket(packet: ByteArray)
  fun protectSocket(fd: Int): Boolean
}

object OpenFluxNative {
  private var loadError: String? = null

  init {
    try {
      System.loadLibrary("openflux")
    } catch (error: UnsatisfiedLinkError) {
      loadError = error.message ?: "OpenFlux native library is unavailable"
    }
  }

  val isAvailable: Boolean
    get() = loadError == null

  fun unavailableReason(): String = loadError ?: ""

  @JvmStatic external fun nativeInitialize(sink: NativePacketSink)
  @JvmStatic external fun nativeStart(configJson: String): String?
  @JvmStatic external fun nativeStop()
  @JvmStatic external fun nativeWritePacket(packet: ByteArray): Boolean
  @JvmStatic external fun nativeGetStatus(): String

  fun initialize(sink: NativePacketSink) {
    check(isAvailable) { unavailableReason() }
    nativeInitialize(sink)
  }

  fun start(configJson: String): String? {
    check(isAvailable) { unavailableReason() }
    return nativeStart(configJson)
  }

  fun stop() {
    if (isAvailable) nativeStop()
  }

  fun writePacket(packet: ByteArray): Boolean = isAvailable && nativeWritePacket(packet)

  fun status(): String = if (isAvailable) nativeGetStatus() else
    "{\"state\":\"ERROR\",\"message\":\"${unavailableReason().replace("\"", "'")}\"}"
}
