package com.openfluxandroid

/** Matches the current OpenFlux exit-node capability: well-formed IPv4/TCP.
 * This rejects malformed frames and prevents accidental logging/forwarding of
 * unsupported UDP or IPv6 traffic. */
object PacketValidator {
  fun isSupported(packet: ByteArray, length: Int): Boolean {
    if (length < 40 || packet[0].toInt().ushr(4) != 4) return false
    val headerLength = (packet[0].toInt() and 0x0f) * 4
    if (headerLength < 20 || headerLength > length) return false
    val totalLength = ((packet[2].toInt() and 0xff) shl 8) or (packet[3].toInt() and 0xff)
    return totalLength in (headerLength + 20)..length && (packet[9].toInt() and 0xff) == 6
  }
}
