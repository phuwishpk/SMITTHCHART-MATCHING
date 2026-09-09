# Production deployment on a VPS

The production stack builds the app in Node, serves only the generated static
files with Nginx, and uses Caddy for automatic HTTPS certificate management.

## Requirements

- A Linux VPS with Docker Engine and Docker Compose
- A domain whose `A`/`AAAA` record points to the VPS
- TCP ports 80 and 443 open (and UDP 443 for HTTP/3)

## Deploy

```bash
git clone <repository-url> smith-chart
cd smith-chart
cp .env.example .env
# Edit .env and set the real domain, without http:// or a path.
docker compose config
docker compose up -d --build
docker compose ps
curl -fsS https://YOUR_DOMAIN/healthz
```

Caddy obtains and renews the TLS certificate automatically. Persistent Caddy
certificate data is stored in the named `caddy_data` volume.

## Update

```bash
git pull --ff-only
docker compose up -d --build
docker image prune -f
```

## Rollback

Check out the previously deployed commit, then rebuild:

```bash
git checkout <known-good-commit>
docker compose up -d --build
```

## Operations

```bash
docker compose ps
docker compose logs --tail=200 app caddy
docker compose restart
```

Back up the repository configuration and the `caddy_data` Docker volume. The
app itself stores user progress in each browser's local storage and has no
server-side database.
