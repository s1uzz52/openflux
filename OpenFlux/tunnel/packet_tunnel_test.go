package tunnel

import "testing"

func TestIsIPv4TCPPacket(t *testing.T) {
	valid := make([]byte, 40)
	valid[0] = 0x45
	valid[2], valid[3] = 0, 40
	valid[9] = 6
	if !isIPv4TCPPacket(valid) {
		t.Fatal("expected a minimal IPv4 TCP packet to be accepted")
	}

	valid[9] = 17
	if isIPv4TCPPacket(valid) {
		t.Fatal("UDP must not be accepted by the TCP-only exit node")
	}
}
