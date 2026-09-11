package com.openfluxandroid

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PacketValidatorTest {
  @Test fun acceptsMinimalIpv4TcpPacket() {
    val packet = ByteArray(40)
    packet[0] = 0x45
    packet[3] = 40
    packet[9] = 6
    assertTrue(PacketValidator.isSupported(packet, packet.size))
  }

  @Test fun rejectsUdpAndMalformedPackets() {
    val packet = ByteArray(40)
    packet[0] = 0x45
    packet[3] = 40
    packet[9] = 17
    assertFalse(PacketValidator.isSupported(packet, packet.size))
    assertFalse(PacketValidator.isSupported(ByteArray(10), 10))
  }
}
