package tunnel

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"universal-bypass-tool/transport"
)

// PacketTunnel is the Android-facing variant of TCPTunnel. Android's
// VpnService already supplies complete IPv4 packets, so putting a SOCKS
// server or another userspace TCP stack in front of it would duplicate work
// and would change sequence numbers. PacketTunnel preserves those packets and
// hands them to the existing OpenFlux transport unchanged (apart from the
// transport's existing compression envelope).
//
// The current OpenFlux exit node and gVisor configuration implement IPv4/TCP.
// UDP and IPv6 are deliberately rejected here instead of silently blackholing
// them or claiming support the exit node does not provide.
type PacketTunnel struct {
	transport transport.Transport
	onPacket  func([]byte)
	running   atomic.Bool
	startedAt time.Time
	upload    atomic.Uint64
	download  atomic.Uint64
	mu        sync.RWMutex
}

type PacketTunnelStats struct {
	UploadBytes   uint64
	DownloadBytes uint64
	Connected     bool
	Uptime        time.Duration
}

func NewPacketTunnel(trans transport.Transport, onPacket func([]byte)) *PacketTunnel {
	t := &PacketTunnel{
		transport: trans,
		onPacket:  onPacket,
		startedAt: time.Now(),
	}

	trans.Receive(func(packet []byte) {
		if !isIPv4TCPPacket(packet) {
			return
		}
		copyOfPacket := append([]byte(nil), packet...)
		t.download.Add(uint64(len(copyOfPacket)))
		t.mu.RLock()
		callback := t.onPacket
		t.mu.RUnlock()
		if callback != nil {
			callback(copyOfPacket)
		}
	})
	return t
}

func (t *PacketTunnel) Start() error {
	if t.running.Swap(true) {
		return nil
	}
	t.startedAt = time.Now()
	if err := t.transport.Start(); err != nil {
		t.running.Store(false)
		return err
	}
	return nil
}

func (t *PacketTunnel) Stop() error {
	if !t.running.Swap(false) {
		return nil
	}
	return t.transport.Stop()
}

// WritePacket accepts a packet read from Android's TUN file descriptor.
func (t *PacketTunnel) WritePacket(packet []byte) error {
	if !t.running.Load() {
		return fmt.Errorf("packet tunnel is not running")
	}
	if !isIPv4TCPPacket(packet) {
		return fmt.Errorf("only valid IPv4/TCP packets are supported")
	}
	copyOfPacket := append([]byte(nil), packet...)
	if err := t.transport.Send(copyOfPacket); err != nil {
		return err
	}
	t.upload.Add(uint64(len(copyOfPacket)))
	return nil
}

func (t *PacketTunnel) IsRunning() bool { return t.running.Load() }

func (t *PacketTunnel) IsConnected() bool {
	return t.running.Load() && t.transport.IsConnected()
}

func (t *PacketTunnel) Stats() PacketTunnelStats {
	return PacketTunnelStats{
		UploadBytes:   t.upload.Load(),
		DownloadBytes: t.download.Load(),
		Connected:     t.IsConnected(),
		Uptime:        time.Since(t.startedAt),
	}
}

func isIPv4TCPPacket(packet []byte) bool {
	if len(packet) < 40 || packet[0]>>4 != 4 {
		return false
	}
	headerLen := int(packet[0]&0x0f) * 4
	if headerLen < 20 || headerLen > len(packet) {
		return false
	}
	totalLen := int(packet[2])<<8 | int(packet[3])
	return totalLen >= headerLen+20 && totalLen <= len(packet) && packet[9] == 6
}
