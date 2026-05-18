# Caddy Dashboard

> **Local development tool only.**  
> The current configuration (self-signed certificates, dashboard exposed without authentication, `.devel` TLD) is designed for local HTTPS development. It is not suitable for production use as-is.

Automatic local HTTPS reverse proxy, driven by Docker labels.  
A Next.js dashboard lists all exposed services in real time and lets you download the local CA certificate.

---

## How it works

```
Browser
    │  https://my-service.devel
    ▼
┌─────────────────────────────────┐
│  Caddy  (caddy-docker-proxy)    │  ← reads Docker labels automatically
│  :80 / :443  •  TLS certs      │
└────────────┬────────────────────┘
             │  reverse_proxy
    ┌─────────┴──────────┐
    │  Docker services   │  ← any container with a caddy label
    └────────────────────┘
             │
    ┌────────┴───────────┐
    │  Dashboard         │  https://dashboard.devel
    │  (Next.js :3000)   │
    └────────────────────┘
```

[`lucaslorentz/caddy-docker-proxy`](https://github.com/lucaslorentz/caddy-docker-proxy) watches the Docker socket and hot-reloads Caddy's config whenever a container starts or stops.  
The dashboard also consumes the Docker socket to display service status in real time via SSE.

---

## Prerequisites

- Docker + Docker Compose v2
- The external `caddy` network must exist (created once):

```bash
docker network create caddy
```

- **dnsmasq** configured to resolve `*.devel` to localhost (see section below)

---

## dnsmasq setup

`.devel` is not a real TLD, so your OS won't resolve it by default. dnsmasq lets you route any `*.devel` domain to `127.0.0.1` without touching `/etc/hosts`.

### Linux (systemd-resolved)

```bash
# Install dnsmasq
sudo apt install dnsmasq        # Debian / Ubuntu
sudo pacman -S dnsmasq          # Arch

# Add a drop-in rule
echo "address=/.devel/127.0.0.1" | sudo tee /etc/dnsmasq.d/devel.conf

# Restart dnsmasq
sudo systemctl restart dnsmasq

# Tell systemd-resolved to use dnsmasq for .devel
sudo mkdir -p /etc/systemd/resolved.conf.d
cat <<EOF | sudo tee /etc/systemd/resolved.conf.d/devel.conf
[Resolve]
DNS=127.0.0.1
Domains=~devel
EOF

sudo systemctl restart systemd-resolved
```

### macOS

```bash
brew install dnsmasq

# Add the wildcard rule
echo "address=/.devel/127.0.0.1" >> $(brew --prefix)/etc/dnsmasq.conf

# Start dnsmasq as a system service
sudo brew services start dnsmasq

# Tell macOS to use dnsmasq for .devel only
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/devel
```

Verify with `ping anything.devel` — it should resolve to `127.0.0.1`.

---

## Getting started

```bash
docker compose up -d
```

The dashboard is available at **https://dashboard.devel** once the CA certificate is imported (see below).

---

## Importing the CA certificate

Caddy generates a local CA on the first HTTPS service startup. Without this certificate imported in the browser, all `.devel` URLs will show a security warning.

1. Open **https://dashboard.devel**
2. Click **Download CA**
3. Import `caddy-local-ca.crt` into your system or browser trust store

> **macOS**: double-click the file → Keychain Access → set to "Always Trust"  
> **Linux**: `sudo cp caddy-local-ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates`  
> **Firefox**: Settings → Privacy & Security → Certificates → Import

---

## Exposing a service

Add labels to the container you want to expose. The service does not need to be in the same `docker-compose.yml` — it just needs to be on the `caddy` network.

### Single URL

```yaml
services:
  my-app:
    image: my-image
    networks:
      - caddy
    labels:
      caddy: my-app.devel
      caddy.reverse_proxy: "{{upstreams 8080}}"

networks:
  caddy:
    external: true
```

### Multiple URLs (HTTP + HTTPS, several domains…)

```yaml
labels:
  caddy_0: my-app.devel
  caddy_0.reverse_proxy: "{{upstreams 8080}}"
  caddy_1: http://my-app.devel
  caddy_1.reverse_proxy: "{{upstreams 8080}}"
```

All `caddy_0`, `caddy_1`… labels are detected and displayed in the dashboard.

---

## Project structure

```
caddy/
├── Caddyfile              # Global config (local_certs)
├── docker-compose.yml     # Caddy + Dashboard
├── data/                  # Caddy data (certs, state) — git-ignored
└── dashboard/             # Next.js 15 / React 19 app
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── icon.svg           # Favicon
        │   └── api/
        │       ├── containers/    # GET — list containers with caddy labels
        │       ├── events/        # SSE — Docker event stream
        │       └── cert/          # GET/HEAD — local CA certificate
        ├── components/
        │   └── Dashboard.tsx      # Main UI
        ├── lib/
        │   └── docker.ts          # Docker socket client (no external deps)
        └── types/
            └── index.ts
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Reverse proxy | [Caddy](https://caddyserver.com) via `caddy-docker-proxy` |
| Dashboard | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS v3 |
| Language | TypeScript strict |
| Package manager | pnpm |
| Containerisation | Docker Compose |

---

## Local dashboard development

```bash
cd dashboard
pnpm install
pnpm dev      # http://localhost:3000
```

The Docker socket (`/var/run/docker.sock`) must be accessible from the host machine.
