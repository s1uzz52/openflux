# OpenFlux Android client

OpenFlux Android is a React Native UI on top of a native Android `VpnService` and the existing OpenFlux Go core. It is not a SOCKS wrapper: Android TUN packets are sent directly into OpenFlux's existing compressed Yandex or MAX transport and replies are written back to the TUN interface.

## Prerequisites

- Node.js 20 or newer and npm;
- Android Studio with Android SDK Platform 36, Build Tools 36, and NDK `27.1.12297006` (the supplied project defaults match these versions);
- Java 17;
- Go **1.26.4 or newer**. This is required because Gradle builds `libopenflux.so` from the adjacent `../OpenFlux` source automatically. No manual copy/build of a native library is necessary.

The project expects this checkout layout:

```text
openflux-client/
  OpenFlux/          # original core and exit-node CLI
  OpenFluxAndroid/   # this app
```

If Go is not on `PATH`, point `GO_EXECUTABLE` to it before running Gradle. `ANDROID_NDK_HOME` can be set when the NDK is outside Android Studio's standard SDK installation.

## Install JavaScript dependencies

```powershell
cd OpenFluxAndroid
npm install
```

## Development on a phone or emulator

Start an emulator or connect a device with USB debugging enabled, then run:

```powershell
npm run android
```

`npm run android` invokes React Native's Android command. Its Gradle build automatically compiles OpenFlux for `arm64-v8a`, the architecture targeted by the original OpenFlux Android script. Use an ARM64 phone or ARM64 emulator; Go's `c-shared` mode does not support the Android x86 ABI, so x86/x86_64 emulators are intentionally not packaged.

On the first connect, Android displays its system VPN approval sheet. Declining it leaves the client disconnected; the UI never reports a connected transport in this case.

## Release APK

From the Android project directory:

```powershell
cd android
.\gradlew.bat assembleRelease
```

The resulting APK is:

```text
OpenFluxAndroid\android\app\build\outputs\apk\release\app-release.apk
```

For a local test build, the template's debug signing key is used. Replace it with a release keystore before distribution.

Install the APK on a connected device:

```powershell
adb install -r .\app\build\outputs\apk\release\app-release.apk
```

## Configure the app

Choose one transport in **Settings**.

- **Yandex**: enter the same legacy Yandex Docs document URL used by the exit node.
- **MAX**: enter the MAX token and the remote MAX user ID. These correspond to the core flags `--maxToken` and `--maxUid`.

Secrets are stored by the Android native layer using `EncryptedSharedPreferences` with a Keystore-backed master key. They are not stored in React Native AsyncStorage or written to the VPN notification. Debug mode is for transport diagnostics only; it excludes credentials and packet payloads.

`Auto reconnect` uses the core transport's reconnect handling. With `Kill switch` enabled, a startup/transport failure leaves the established all-traffic TUN route in place, so captured traffic is blocked rather than falling back directly while the service waits for an explicit retry or Disconnect. It intentionally does not pretend to replace Android's user-controlled **Always-on VPN / Block connections without VPN** lockdown setting, which can be enabled in Android Settings for stronger device-wide enforcement.

## Traffic capability and limitations

The original current core uses an IPv4-only gVisor TCP stack and raw TCP exit-node path. Therefore this client intentionally forwards only well-formed **IPv4/TCP** packets. It does **not** claim protection for IPv6, UDP, DNS-over-UDP, QUIC, or UDP-based apps. Unsupported packets are rejected locally rather than shown as protected traffic.

Yandex/ MAX control sockets are created by Go through a protected dialer. The Android JNI bridge calls `VpnService.protect(fd)` before each connection, keeping those sockets on the underlying network and preventing a TUN routing loop.

## Tests

```powershell
npm test
cd android
.\gradlew.bat test
```

Go packet validation is covered by `OpenFlux/tunnel/packet_tunnel_test.go`; Android packet validation has a Kotlin unit test; the React reducer test covers state and the no-false-connected transition.

### Manual VPN checklist

1. Enter valid Yandex or MAX settings and accept the system VPN permission.
2. Verify `STARTING`/`CONNECTING` changes to `CONNECTED` only after the transport reports its handshake ready.
3. Open a TCP-only test destination through the configured exit node; confirm upload/download counters change from native packet flow.
4. Disconnect and verify the Android VPN key indicator and foreground notification disappear.
5. Interrupt the transport network and verify the UI returns to `CONNECTING`, not a stale `CONNECTED`; restore network and verify reconnect.
6. Deny the permission, use a bad URL, invalid MAX ID, or stop the exit node: confirm that UI error text is human-readable and no stack trace or secret appears.
7. Remove/reopen the Activity while the service runs; verify current service status is reloaded from the native service.

## Troubleshooting

- **`go` is not recognized**: install the Go version required by `../OpenFlux/go.mod`, or set `GO_EXECUTABLE` to the Go executable. Gradle needs it to compile the in-app core.
- **NDK compiler not found**: install NDK `27.1.12297006` in Android Studio SDK Manager or set the Android SDK/NDK location appropriately.
- **VPN permission denied**: use Connect again and approve Android's VPN request.
- **Still Connecting**: check that the app and exit node have identical transport credentials and that the exit node service/logs are healthy. Do not enable `CONNECTED` manually; the state is deliberately derived from the transport.
- **No browsing despite Connected**: verify the test uses IPv4/TCP. UDP/QUIC/IPv6 are current core limitations, not a UI setting.

For deployment of the Linux exit node, see [`../OpenFlux/VPS_SETUP.md`](../OpenFlux/VPS_SETUP.md).
