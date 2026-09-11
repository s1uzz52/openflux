# OpenFlux exit node on Ubuntu / Debian

This guide deploys the existing OpenFlux **exit node** used by the Android client. A domain is not required: the first working setup uses a public VPS IP plus either the shared Yandex document URL or MAX credentials.

> OpenFlux uses raw sockets and is a network-stack research tool. Run it only on a VPS and accounts you control or are authorised to operate.

## 1. Install prerequisites

```bash
sudo apt update
sudo apt install -y git curl build-essential iptables ca-certificates
```

Install Go 1.26.4 or a later version compatible with [`go.mod`](go.mod). The exact package route varies by Debian/Ubuntu release; the official Go tarball is suitable when the distro package is older:

```bash
GO_VERSION=1.26.4
ARCH=amd64
curl -fsSLO "https://go.dev/dl/go${GO_VERSION}.linux-${ARCH}.tar.gz"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-${ARCH}.tar.gz"
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
export PATH=$PATH:/usr/local/go/bin
go version
```

For ARM64 VPSs use `ARCH=arm64`.

## 2. Clone and build the actual project

```bash
git clone https://github.com/p1neappleXpress/OpenFlux.git
cd OpenFlux
go mod tidy
go build -o openflux .
```

The current CLI flags in `main.go` are:

- `--exit-node` — exit-node mode;
- `--transport yandex` or `--transport max` (the historical alias `oneme` is also accepted);
- `--url` — Yandex document URL;
- `--maxToken` — MAX authentication token;
- `--maxUid` — MAX user ID;
- `--debug` — verbose diagnostics.

## 3. Required RST rule

The raw-socket exit node needs the TCP RST drop rule documented by the original project:

```bash
sudo iptables -A OUTPUT -p tcp --tcp-flags RST RST -j DROP
```

Check it with:

```bash
sudo iptables -S OUTPUT | grep -- '--tcp-flags RST RST'
```

This is a host-wide OUTPUT rule. Assess it before applying it to a shared production machine. Persist it only using the firewall mechanism appropriate for your distribution after validating the node.

## 4. Test an exit node interactively

Yandex:

```bash
sudo ./openflux --exit-node --transport yandex --url "YOUR_YANDEX_DOC_URL" --debug
```

MAX:

```bash
sudo ./openflux --exit-node --transport max --maxToken "YOUR_MAX_TOKEN" --maxUid "YOUR_MAX_USER_ID" --debug
```

Use the same selected transport and matching configuration in the Android app. Do not put tokens in shell history on a shared system; the systemd approach below uses a root-readable environment file.

## 5. Install a systemd service

Install the compiled binary and create a dedicated config directory:

```bash
sudo install -Dm755 ./openflux /usr/local/bin/openflux
sudo install -d -m700 /etc/openflux
sudo nano /etc/openflux/openflux.env
```

For Yandex, `/etc/openflux/openflux.env`:

```ini
OPENFLUX_TRANSPORT=yandex
OPENFLUX_URL=YOUR_YANDEX_DOC_URL
OPENFLUX_DEBUG=false
```

For MAX, `/etc/openflux/openflux.env`:

```ini
OPENFLUX_TRANSPORT=max
OPENFLUX_MAX_TOKEN=YOUR_MAX_TOKEN
OPENFLUX_MAX_UID=YOUR_MAX_USER_ID
OPENFLUX_DEBUG=false
```

Lock down the file:

```bash
sudo chmod 600 /etc/openflux/openflux.env
```

Create `/etc/systemd/system/openflux.service`:

```ini
[Unit]
Description=OpenFlux exit node
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/etc/openflux
EnvironmentFile=/etc/openflux/openflux.env
ExecStart=/bin/sh -c '/usr/local/bin/openflux --exit-node --transport "$OPENFLUX_TRANSPORT" --url "$OPENFLUX_URL" --maxToken "$OPENFLUX_MAX_TOKEN" --maxUid "$OPENFLUX_MAX_UID" $([ "$OPENFLUX_DEBUG" = "true" ] && printf -- "--debug")'
Restart=always
RestartSec=5
LimitNOFILE=65536
NoNewPrivileges=false

[Install]
WantedBy=multi-user.target
```

Then activate it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable openflux
sudo systemctl start openflux
sudo systemctl status openflux
sudo journalctl -u openflux -f
```

Restart after changing the environment file or binary:

```bash
sudo systemctl restart openflux
```

## 6. Firewall

OpenFlux's transports make **outbound** connections to Yandex or MAX. It does not require an inbound listener or domain for the architecture in this repository. Keep your management SSH rule, and permit the outbound TCP connectivity required by the selected transport (normally HTTPS/WSS):

```bash
sudo ufw allow OpenSSH
sudo ufw allow out 443/tcp
sudo ufw enable
sudo ufw status verbose
```

When using another firewall manager, apply equivalent outbound rules. Do not publish a port solely for OpenFlux unless a separately deployed component explicitly requires it.

## Operations and failure checks

```bash
sudo systemctl status openflux
sudo journalctl -u openflux -n 100 --no-pager
sudo journalctl -u openflux -f
sudo iptables -S OUTPUT
```

If the client remains `CONNECTING`, confirm the same transport configuration is present on both peers, the Yandex document uses the legacy supported editor mode, or the MAX credentials are valid. Do not paste MAX tokens into tickets or logs.
