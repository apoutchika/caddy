# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local dashboard development (Docker socket must be accessible on the host)
cd dashboard
pnpm install
pnpm dev        # http://localhost:3000

# Production build
pnpm build

# Full stack via Docker
docker compose up -d
docker compose down
```

There is no test suite in this project.

## Architecture

This project is a local HTTPS reverse proxy for development, made of two components:

**Caddy** (`docker-compose.yml`) — uses the `lucaslorentz/caddy-docker-proxy` image, which watches the Docker socket and dynamically generates its configuration from container labels. The root `Caddyfile` only enables `local_certs`.

**Dashboard** (`dashboard/`) — Next.js 15 App Router, built as `standalone`. It connects directly to the Docker socket (mounted read-only in the container) to display real-time service status.

### Real-time flow

The dashboard uses SSE (Server-Sent Events) to stay up to date without polling:

1. `/api/events` — opens a stream on Docker's `GET /events` API (filtered to container events) and forwards the action name (`start`, `stop`, `die`…) to the client via SSE.
2. `Dashboard.tsx` (`useEffect` on `EventSource`) — receives the action and calls `fetchContainers()`. For `start`/`create` events, a 500 ms delay is applied before fetching to let the Docker daemon update the container state in its API (known race condition).

### API routes

| Route | Purpose |
|---|---|
| `GET /api/containers` | Lists containers with `caddy`/`caddy_N` labels via Docker API; excludes the dashboard itself (hostname comparison) |
| `GET /api/events` | SSE — streams Docker events, sends the action name as the payload |
| `GET /api/cert` | Downloads the Caddy CA certificate from `/caddy-data/caddy/pki/authorities/local/root.crt` |
| `HEAD /api/cert` | Checks whether the certificate exists (used by `CertBanner`) |

### Docker labels

A container appears in the dashboard if it has a `caddy` label (single URL) or `caddy_0`, `caddy_1`… labels (multiple URLs). Both forms can be combined. The `com.docker.compose.project` label is used to group containers by project.

### `docker.ts`

Minimal HTTP client over the Unix socket `/var/run/docker.sock`, with no external dependencies. Two functions: `dockerGet<T>` (JSON request) and `dockerStream` (line-by-line stream for events).
