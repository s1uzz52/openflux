package transport

import (
	"context"
	"net"
	"sync"
	"syscall"
)

// SocketProtector is supplied by the Android JNI bridge. Calling
// VpnService.protect(fd) before connect keeps OpenFlux control/transport
// sockets on the physical network instead of recursively entering the TUN.
// It is a no-op on desktop builds.
type SocketProtector func(fd int) bool

var socketProtector struct {
	sync.RWMutex
	callback SocketProtector
}

func SetSocketProtector(callback SocketProtector) {
	socketProtector.Lock()
	defer socketProtector.Unlock()
	socketProtector.callback = callback
}

func ProtectedDialContext(ctx context.Context, network, address string) (net.Conn, error) {
	dialer := net.Dialer{
		Control: func(_, _ string, rawConn syscall.RawConn) error {
			var protected bool
			controlErr := rawConn.Control(func(fd uintptr) {
				socketProtector.RLock()
				callback := socketProtector.callback
				socketProtector.RUnlock()
				if callback != nil {
					protected = callback(int(fd))
				}
			})
			if controlErr != nil {
				return controlErr
			}
			// Android only reaches this branch when a VpnService is active. A
			// failed protect would create a routing loop, so fail closed.
			if callbackInstalled() && !protected {
				return syscall.EPERM
			}
			return nil
		},
	}
	return dialer.DialContext(ctx, network, address)
}

func callbackInstalled() bool {
	socketProtector.RLock()
	defer socketProtector.RUnlock()
	return socketProtector.callback != nil
}
