# Caddy Dashboard

Reverse proxy HTTPS local automatique, piloté par les labels Docker.  
Un dashboard Next.js liste en temps réel tous les services exposés et permet de télécharger le certificat CA local.

---

## Fonctionnement

```
Navigateur
    │  https://mon-service.devel
    ▼
┌─────────────────────────────────┐
│  Caddy  (caddy-docker-proxy)    │  ← lit les labels Docker automatiquement
│  :80 / :443  •  certificats TLS │
└────────────┬────────────────────┘
             │  reverse_proxy
    ┌─────────┴──────────┐
    │  Services Docker   │  ← n'importe quel conteneur avec un label caddy
    └────────────────────┘
             │
    ┌────────┴───────────┐
    │  Dashboard         │  https://dashboard.devel
    │  (Next.js :3000)   │
    └────────────────────┘
```

[`lucaslorentz/caddy-docker-proxy`](https://github.com/lucaslorentz/caddy-docker-proxy) surveille le socket Docker et recharge la config Caddy à chaud quand un conteneur démarre ou s'arrête.  
Le dashboard consomme lui aussi le socket Docker pour afficher l'état des services en temps réel via SSE.

---

## Prérequis

- Docker + Docker Compose v2
- Le réseau externe `caddy` doit exister (créé une seule fois) :

```bash
docker network create caddy
```

---

## Démarrage

```bash
docker compose up -d
```

Le dashboard est accessible sur **https://dashboard.devel** dès que le certificat CA est importé (voir section ci-dessous).

---

## Importer le certificat CA

Caddy génère un CA local au premier démarrage d'un service HTTPS. Sans ce certificat importé dans le navigateur, toutes les URLs `.devel` afficheront une alerte de sécurité.

1. Ouvrir **https://dashboard.devel**
2. Cliquer sur **Télécharger le CA**
3. Importer `caddy-local-ca.crt` dans le trousseau du système ou du navigateur

> **macOS** : double-clic sur le fichier → Trousseau d'accès → passer en "Toujours approuver"  
> **Linux** : `sudo cp caddy-local-ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates`  
> **Firefox** : Paramètres → Vie privée → Certificats → Importer

---

## Exposer un service

Ajouter des labels au conteneur à exposer. Le service n'a pas besoin d'être dans le même `docker-compose.yml`, il suffit qu'il soit sur le réseau `caddy`.

### URL unique

```yaml
services:
  mon-app:
    image: mon-image
    networks:
      - caddy
    labels:
      caddy: mon-app.devel
      caddy.reverse_proxy: "{{upstreams 8080}}"

networks:
  caddy:
    external: true
```

### URLs multiples (HTTP + HTTPS, plusieurs domaines…)

```yaml
labels:
  caddy_0: mon-app.devel
  caddy_0.reverse_proxy: "{{upstreams 8080}}"
  caddy_1: http://mon-app.devel
  caddy_1.reverse_proxy: "{{upstreams 8080}}"
```

Les labels `caddy_0`, `caddy_1`, … sont tous détectés et affichés dans le dashboard.

---

## Structure du projet

```
caddy/
├── Caddyfile              # Config globale (local_certs)
├── docker-compose.yml     # Caddy + Dashboard
├── data/                  # Données Caddy (certificats, state) — ignoré par git
└── dashboard/             # Application Next.js 15 / React 19
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── icon.svg           # Favicon
        │   └── api/
        │       ├── containers/    # GET — liste les conteneurs avec labels caddy
        │       ├── events/        # SSE — stream des événements Docker
        │       └── cert/          # GET/HEAD — certificat CA local
        ├── components/
        │   └── Dashboard.tsx      # UI principale
        ├── lib/
        │   └── docker.ts          # Client socket Docker (sans dépendances)
        └── types/
            └── index.ts
```

---

## Stack technique

| Couche | Technologie |
|---|---|
| Reverse proxy | [Caddy](https://caddyserver.com) via `caddy-docker-proxy` |
| Dashboard | Next.js 15 (App Router) + React 19 |
| Style | Tailwind CSS v3 |
| Langage | TypeScript strict |
| Package manager | pnpm |
| Conteneurisation | Docker Compose |

---

## Développement local du dashboard

```bash
cd dashboard
pnpm install
pnpm dev      # http://localhost:3000
```

Le socket Docker (`/var/run/docker.sock`) doit être accessible depuis la machine hôte.
