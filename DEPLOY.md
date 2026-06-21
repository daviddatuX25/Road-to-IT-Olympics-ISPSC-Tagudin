# Deploying RIO to Dokploy

This doc is everything you need to deploy the RIO app to a Dokploy instance.
Tested locally with `docker compose` — the same image runs unchanged on Dokploy.

---

## 1. What Dokploy needs

Dokploy runs Docker containers. You have two paths:

| Option | How | Best for |
|---|---|---|
| **A. Docker Compose** (recommended) | Paste the contents of `docker-compose.yml` into a Dokploy Compose app | Keeps it identical to local — least surprise |
| **B. Dockerfile app** | Point Dokploy at this repo, set Build Type = Dockerfile, port = `81` | If you prefer Dokploy to build from source |

The app listens on **port 81** (Caddy reverse proxy → Next.js on 3000 inside the container).
Expose **81** in Dokploy's port settings.

---

## 2. Required environment variables

Set these in Dokploy's "Environment Variables" section:

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `HOSTNAME` | `0.0.0.0` | Bind to all interfaces inside container |
| `PORT` | `3000` | Next.js internal port (Caddy proxies to it) |
| `SESSION_SECRET` | **generate your own** — see below | HMAC key for session cookies |
| `DATABASE_URL` | `file:/app/db/custom.db` | SQLite path (already the default if unset) |

### Generate a real SESSION_SECRET

```bash
openssl rand -hex 32
```

Paste the output (64 hex chars) as the `SESSION_SECRET` value.
**Do not reuse the placeholder from `docker-compose.yml`.** Without a stable secret, all
user sessions invalidate on every container restart/redeploy.

---

## 3. Critical: HTTPS / domain for login to work

The app sets **secure cookies** when `NODE_ENV=production`
(see `src/lib/auth.ts:59`). Secure cookies are only sent over HTTPS —
so **login will silently fail over plain HTTP** in production.

➡ On Dokploy this is automatic: assign a domain and enable the proxy/TLS.
Dokploy issues a Let's Encrypt cert and terminates TLS at its proxy.
Once the domain resolves over `https://`, login works.

If you must test login before DNS/TLS is ready, temporarily set `NODE_ENV=development`
(only for testing — reverts to non-secure cookies).

---

## 4. Database persistence

The SQLite DB lives at `/app/db/custom.db` inside the container and is mounted on a
**named volume (`rio-db`)** in `docker-compose.yml`. This means:

- ✅ Data survives container restarts and image rebuilds.
- ✅ The database schema is automatically synced at container startup, so you do not need to run manual migration commands when redeploying new versions.
- ⚠️ Data does **NOT** carry over if you delete the volume or switch deploy methods.

To seed a fresh Dokploy deploy with your local DB data:
1. Copy `db/custom.db` from this repo to the server, **or**
2. Use Dokploy's volume mount to point `/app/db` at a persistent path, **or**
3. The first deploy auto-seeds from the DB baked into the image (which is your local DB).

Option 3 is the default and is usually fine — your local data ships inside the image.

---

## 5. Pre-deploy checklist

- [ ] `SESSION_SECRET` generated and set as env var (not the placeholder)
- [ ] Domain assigned in Dokploy with TLS/proxy enabled
- [ ] Port **81** exposed
- [ ] `NODE_ENV=production`
- [ ] Volume mapped for `/app/db` so DB data persists
- [ ] Smoke test after deploy: visit `https://<your-domain>/` → expect the
      "Road to IT Olympics — Practice Loop" page

---

## 6. If something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| Login button does nothing / immediate logout | App running over HTTP in prod (secure cookies) | Enable TLS/domain in Dokploy |
| 502 / connection refused | Wrong port exposed in Dokploy | Expose **81**, not 3000 |
| Empty DB / no users | Volume was reset | Re-deploy (image bakes in the seed DB) |
| Sessions reset every restart | `SESSION_SECRET` missing or changing | Set a stable `SESSION_SECRET` |
| Build fails on Dokploy | Same `@next/swc` flakiness seen locally | Retry the build (transient network issue) |

---

## 7. Local reference (for sanity checks before deploy)

```bash
# Build & run locally — should still work
docker compose up -d --build

# Test
curl http://localhost:81/    # → HTTP 200, "Road to IT Olympics" page

# Tail logs
docker compose logs -f rio

# Stop (preserves DB volume)
docker compose down
```
