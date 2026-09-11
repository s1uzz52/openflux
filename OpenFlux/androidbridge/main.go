//go:build androidbridge

package main

/*
#include <stdlib.h>
#include "bridge.h"
*/
import "C"

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
	"unsafe"

	"universal-bypass-tool/transport"
	"universal-bypass-tool/transport/oneme"
	"universal-bypass-tool/transport/yandex"
	"universal-bypass-tool/tunnel"
	"universal-bypass-tool/utils"
)

type androidConfig struct {
	Transport     string `json:"transport"`
	YandexURL     string `json:"yandexUrl"`
	MaxToken      string `json:"maxToken"`
	MaxUID        string `json:"maxUid"`
	Debug         bool   `json:"debug"`
	AutoReconnect bool   `json:"autoReconnect"`
	KillSwitch    bool   `json:"killSwitch"`
}

type androidStatus struct {
	State         string `json:"state"`
	Message       string `json:"message,omitempty"`
	Transport     string `json:"transport"`
	UploadBytes   uint64 `json:"uploadBytes"`
	DownloadBytes uint64 `json:"downloadBytes"`
	UptimeSeconds uint64 `json:"uptimeSeconds"`
	Connected     bool   `json:"connected"`
}

var androidRuntime struct {
	sync.RWMutex
	tunnel    *tunnel.PacketTunnel
	transport string
	startedAt time.Time
	message   string
	state     string
}

//export OpenFluxStart
func OpenFluxStart(rawConfig *C.char) *C.char {
	if rawConfig == nil {
		return C.CString("missing VPN configuration")
	}
	var config androidConfig
	if err := json.Unmarshal([]byte(C.GoString(rawConfig)), &config); err != nil {
		return C.CString("invalid VPN configuration")
	}
	if err := validateConfig(config); err != nil {
		return C.CString(err.Error())
	}

	androidRuntime.Lock()
	if androidRuntime.tunnel != nil && androidRuntime.tunnel.IsRunning() {
		androidRuntime.Unlock()
		return nil
	}
	androidRuntime.state = "STARTING"
	androidRuntime.message = "Preparing encrypted transport"
	androidRuntime.transport = config.Transport
	androidRuntime.startedAt = time.Now()
	androidRuntime.Unlock()

	if config.Debug {
		utils.EnableDebug()
	}
	// Every outbound transport/control socket must leave through the physical
	// network. VpnService.protect is invoked before connect by
	// transport.ProtectedDialContext; if Android rejects it, the dialer fails
	// closed instead of sending the transport into this VPN's own TUN.
	transport.SetSocketProtector(func(fd int) bool {
		return C.openflux_protect_socket(C.int(fd)) != 0
	})
	trans, err := createTransport(config)
	if err != nil {
		transport.SetSocketProtector(nil)
		setAndroidError(err)
		return C.CString("transport setup failed")
	}
	packetTunnel := tunnel.NewPacketTunnel(trans, func(packet []byte) {
		C.openflux_emit_packet((*C.char)(unsafe.Pointer(&packet[0])), C.int(len(packet)))
	})
	if err := packetTunnel.Start(); err != nil {
		transport.SetSocketProtector(nil)
		setAndroidError(err)
		return C.CString("transport startup failed")
	}

	androidRuntime.Lock()
	androidRuntime.tunnel = packetTunnel
	androidRuntime.state = "CONNECTING"
	androidRuntime.message = "Waiting for transport handshake"
	androidRuntime.Unlock()
	return nil
}

//export OpenFluxStop
func OpenFluxStop() {
	androidRuntime.Lock()
	packetTunnel := androidRuntime.tunnel
	androidRuntime.state = "DISCONNECTING"
	androidRuntime.message = "Closing transport"
	androidRuntime.tunnel = nil
	androidRuntime.Unlock()
	if packetTunnel != nil {
		_ = packetTunnel.Stop()
	}
	transport.SetSocketProtector(nil)
	androidRuntime.Lock()
	androidRuntime.state = "DISCONNECTED"
	androidRuntime.message = "VPN is off"
	androidRuntime.Unlock()
}

//export OpenFluxWritePacket
func OpenFluxWritePacket(data *C.char, length C.int) C.int {
	if data == nil || length <= 0 || length > 65535 {
		return 0
	}
	androidRuntime.RLock()
	packetTunnel := androidRuntime.tunnel
	androidRuntime.RUnlock()
	if packetTunnel == nil {
		return 0
	}
	packet := C.GoBytes(unsafe.Pointer(data), length)
	if err := packetTunnel.WritePacket(packet); err != nil {
		return 0
	}
	return 1
}

//export OpenFluxGetStatus
func OpenFluxGetStatus() *C.char {
	androidRuntime.RLock()
	packetTunnel := androidRuntime.tunnel
	status := androidStatus{
		State:     androidRuntime.state,
		Message:   androidRuntime.message,
		Transport: androidRuntime.transport,
	}
	startedAt := androidRuntime.startedAt
	androidRuntime.RUnlock()

	if packetTunnel != nil {
		stats := packetTunnel.Stats()
		status.UploadBytes = stats.UploadBytes
		status.DownloadBytes = stats.DownloadBytes
		status.UptimeSeconds = uint64(time.Since(startedAt).Seconds())
		status.Connected = stats.Connected
		if stats.Connected {
			status.State = "CONNECTED"
			status.Message = "Transport connected"
		} else if status.State != "ERROR" {
			status.State = "CONNECTING"
			status.Message = "Waiting for transport handshake"
		}
	}
	if status.State == "" {
		status.State = "DISCONNECTED"
		status.Message = "VPN is off"
	}
	encoded, _ := json.Marshal(status)
	return C.CString(string(encoded))
}

//export OpenFluxFreeString
func OpenFluxFreeString(value *C.char) {
	C.free(unsafe.Pointer(value))
}

func createTransport(config androidConfig) (transport.Transport, error) {
	settings := transport.DefaultConfig()
	if !config.AutoReconnect {
		settings.MaxReconnectAttempts = 0
	}
	switch strings.ToLower(config.Transport) {
	case "yandex":
		return transport.NewCompressedTransport(yandex.NewYandexDocsTransport(config.YandexURL, settings)), nil
	case "max", "oneme":
		uid, _ := strconv.ParseInt(config.MaxUID, 10, 64)
		return transport.NewCompressedTransport(oneme.NewOneMeTransport(false, config.MaxToken, uid, settings)), nil
	default:
		return nil, fmt.Errorf("unknown transport")
	}
}

func validateConfig(config androidConfig) error {
	switch strings.ToLower(config.Transport) {
	case "yandex":
		parsed, err := url.ParseRequestURI(config.YandexURL)
		if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
			return fmt.Errorf("enter a valid Yandex document URL")
		}
	case "max", "oneme":
		if strings.TrimSpace(config.MaxToken) == "" {
			return fmt.Errorf("enter the MAX token")
		}
		if _, err := strconv.ParseInt(strings.TrimSpace(config.MaxUID), 10, 64); err != nil {
			return fmt.Errorf("enter a valid MAX user ID")
		}
	default:
		return fmt.Errorf("choose a transport")
	}
	return nil
}

func setAndroidError(err error) {
	androidRuntime.Lock()
	defer androidRuntime.Unlock()
	androidRuntime.state = "ERROR"
	androidRuntime.message = "Unable to start transport"
	utils.Debugf("[ANDROID] startup error: %v", err)
}

func main() {}
