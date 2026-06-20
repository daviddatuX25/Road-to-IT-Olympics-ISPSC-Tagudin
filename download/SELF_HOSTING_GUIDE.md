# Self-Hosting Guide — Road to IT Olympics on a Home Server

This guide walks you through deploying the Road to IT Olympics platform on a home server (a Linux box, an old laptop, a Raspberry Pi 4/5, or a Mini PC). The whole thing fits on a single machine: Next.js app + SQLite database + Caddy reverse proxy (for HTTPS on your home network).

**Why self-host**: no third party holding student data, no per-seat SaaS billing, full control. The trade-off is that **you** are now the ops team — backups, updates, and uptime are your responsibility. The platform is designed to be resilient to short downtime (the streak engine skips weeks with no active milestones), but data loss is permanent. **Set up backups before you launch.**

---

## 1. Prerequisites

### Hardware
- Any x86_64 or ARM64 Linux machine that stays on. A Raspberry Pi 4 (4GB+) works for a small club; a Mini PC or old laptop is more comfortable.
- ~10 GB free disk for the app + DB + backups.
- Stable power. A small UPS (~$50) is worth it — power blips will otherwise corrupt your SQLite DB eventually.

### Network
- The server needs to be reachable from the network your students will use. For a school club on the same LAN, that's just the server's local IP — no port forwarding needed.
- For access off-campus (students practicing from home), you'll need either:
  - **Tailscale** (recommended — zero-config mesh VPN, free for personal use, no port forwarding), or
  - **Cloudflare Tunnel** (free, exposes the app via a public hostname without opening ports), or
  - Port forwarding on your router (not recommended — exposes the server directly).

### Software on the server
- **Bun** (preferred) or **Node.js 20+**. Install Bun:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  # then source your shell or restart
  ```
- **Git**: `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora)
- **Caddy** (for HTTPS reverse proxy): see [caddyserver.com/docs/install](https://caddyserver.com/docs/install). On Debian/Ubuntu:
  ```bash
  sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update && sudo apt install caddy
  ```
- **pm2** (process manager — keeps the app running and restarts on crash):
  ```bash
  bun add -g pm2
  # or with Node: npm install -g pm2
  ```

---

## 2. Get the code onto the server

```bash
# From your dev machine, push to a private GitHub/Gitea repo, then clone on the server.
# Or scp the project folder directly:
scp -r ./road-to-it-olympics user@server-ip:~/

# On the server:
cd ~/road-to-it-olympics
bun install   # or npm install
```

If you don't have a git remote set up, `rsync` works too:
```bash
rsync -av --exclude node_modules --exclude .next --exclude db/ \
  ./ user@server-ip:~/road-to-it-olympics/
```

---

## 3. Configure environment

Create a `.env` file in the project root. **Generate a strong `SESSION_SECRET`** — this signs the auth cookies, and if it leaks or is too weak, someone could forge sessions.

```bash
# Generate a strong secret
openssl rand -hex 32

# Create .env
cat > .env <<EOF
DATABASE_URL=file:/home/YOURUSER/road-to-it-olympics/db/custom.db
SESSION_SECRET=PASTE_THE_HEX_FROM_ABOVE_HERE
EOF

chmod 600 .env   # only your user can read it
```

**Critical:**
- `SESSION_SECRET` should be 32+ random hex characters. Never commit it to git. Never reuse it across environments.
- The `DATABASE_URL` path must be absolute, not relative, so the app finds the DB regardless of working directory.

---

## 4. Initialize the database

```bash
# Push the schema (creates the SQLite file with all tables)
bun run db:push

# Seed the initial admin/instructor/student accounts + 6 domains + sample milestones
bun run scripts/seed.ts
```

After seeding, you can sign in with:
- `admin@ito.test` / `olypmics2026` — full system config
- `instructor@ito.test` / `olypmics2026` — author milestones, see all
- `lia@ito.test` / `olypmics2026` — student + Java captain (4-week streak)

**Change the admin password immediately after first login.** Go to Profile → ... actually the password change isn't in the UI yet — for now, regenerate it via the admin user-management screen (delete + recreate), or wait for the password-change feature.

---

## 5. Build for production

```bash
bun run build
```

This produces a standalone server in `.next/standalone/` that doesn't need the dev server. The build also copies `public/` and `.next/static` into the standalone folder automatically (per `package.json`'s `build` script).

Verify the build runs:
```bash
bun run start
# Should print "▲ Next.js 16.x" and listen on port 3000
# Ctrl+C to stop
```

---

## 6. Run with pm2 (keeps it alive across reboots)

Create an ecosystem file:

```bash
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [{
    name: 'ito-olympics',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '127.0.0.1',  // only listen on localhost — Caddy will proxy
    },
    cwd: __dirname,
    instances: 1,            // SQLite doesn't scale horizontally; keep 1
    autorestart: true,
    max_restarts: 10,
    max_memory_restart: '500M',
  }]
}
EOF
```

Start it:
```bash
pm2 start ecosystem.config.cjs
pm2 save                # remember the current process list
pm2 startup             # follow the printed instruction to make pm2 start on boot
```

Useful commands:
- `pm2 status` — see if it's running
- `pm2 logs ito-olympics` — tail logs (Ctrl+C to exit)
- `pm2 restart ito-olympics` — restart after a code update
- `pm2 stop ito-olympics` — stop the app

---

## 7. Caddy reverse proxy (HTTPS on your LAN)

Caddy gives you free automatic HTTPS via Let's Encrypt — but on a LAN without a public hostname, you'll use a self-signed cert instead. Either way, Caddy handles the TLS termination and proxies to your Next.js app.

### Option A: LAN-only with self-signed cert (simplest)

Edit `/etc/caddy/Caddyfile`:

```caddy
:443 {
  tls internal   # self-signed cert — browsers will warn; users accept once

  reverse_proxy 127.0.0.1:3000 {
    header_up Host {host}
    header_up X-Forwarded-Host {host}
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}
    header_up X-Real-IP {remote_host}
  }
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

Students access via `https://server-ip/` and accept the self-signed cert warning once. Works on the LAN.

### Option B: Public hostname via Cloudflare Tunnel (free, no port forwarding)

1. Sign up for Cloudflare, register a domain (or use a free `*.workers.dev`).
2. Install cloudflared: `sudo apt install cloudflared`
3. Authenticate: `cloudflared tunnel login`
4. Create a tunnel: `cloudflared tunnel create ito-olympics`
5. Configure it to forward to your local app:
   ```bash
   cat > ~/.cloudflared/config.yml <<EOF
   tunnel: <TUNNEL_ID_FROM_PREVIOUS_STEP>
   credentials-file: /home/YOURUSER/.cloudflared/<TUNNEL_ID>.json
   ingress:
     - hostname: olympics.yourdomain.com
       service: http://127.0.0.1:3000
     - service: http_status:404
   EOF
   ```
6. Point your domain's DNS at the tunnel (Cloudflare's dashboard does this automatically when you run `cloudflared tunnel route dns <TUNNEL_ID> olympics.yourdomain.com`).
7. Run cloudflared as a service:
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

Now `https://olympics.yourdomain.com` reaches your home server through Cloudflare's edge — no port forwarding, no exposed public IP, automatic HTTPS.

### Option C: Tailscale (for a closed group)

If only your club needs access (not the whole school), Tailscale is the simplest:
1. Install on the server: `curl -fsSL https://tailscale.com/install.sh | sh`
2. `sudo tailscale up`
3. Install on each student's device, same auth.
4. They access via `http://server-tailscale-name:3000` (or use Caddy for HTTPS too).

No DNS, no certs, no port forwarding. Tailscale handles it.

---

## 8. Backups (DO THIS BEFORE YOU LAUNCH)

SQLite is a single file. Backing it up is just copying the file — but **don't copy while a write is in progress**, or you'll get a torn copy. Two safe approaches:

### Approach 1: SQLite Online Backup (recommended)

This uses SQLite's online backup API to produce a consistent snapshot even while the app is running. Create `scripts/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_PATH="/home/YOURUSER/road-to-it-olympics/db/custom.db"
BACKUP_DIR="/home/YOURUSER/backups/ito-olympics"
mkdir -p "$BACKUP_DIR"

DATE=$(date -u +%Y%m%dT%H%M%SZ)
DEST="$BACKUP_DIR/custom-$DATE.db"

# Use sqlite3's .backup command (safe against in-progress writes).
# If sqlite3 isn't installed: sudo apt install sqlite3
sqlite3 "$DB_PATH" ".backup '$DEST'"

# Compress to save space
gzip "$DEST"

# Keep only the last 30 days of backups
find "$BACKUP_DIR" -name 'custom-*.db.gz' -mtime +30 -delete

echo "Backup written to $DEST.gz"
```

Make it executable and schedule it:
```bash
chmod +x scripts/backup.sh

# Run nightly at 3 AM
crontab -e
# Add this line:
0 3 * * * /home/YOURUSER/road-to-it-olympics/scripts/backup.sh >> /home/YOURUSER/backups/ito-olympics/backup.log 2>&1
```

### Approach 2: File copy with WAL checkpoint

If you don't have `sqlite3` installed and don't want to install it, a simpler (slightly less safe) approach:

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_PATH="/home/YOURUSER/road-to-it-olympics/db/custom.db"
BACKUP_DIR="/home/YOURUSER/backups/ito-olympics"
mkdir -p "$BACKUP_DIR"

DATE=$(date -u +%Y%m%dT%H%M%SZ)
DEST="$BACKUP_DIR/custom-$DATE.db"

# Force WAL checkpoint by briefly stopping the app, then copy.
# (This is the safest of all — but means ~5 seconds of downtime.)
pm2 stop ito-olympics
sleep 2
cp "$DB_PATH" "$DEST"
pm2 start ito-olympics

gzip "$DEST"
find "$BACKUP_DIR" -name 'custom-*.db.gz' -mtime +30 -delete
```

### Off-site backup (do this too)

A nightly local backup protects against accidental deletion. It does **not** protect against disk failure, fire, or theft. Push the backup somewhere physically separate:

- **Free tier object storage**: Backblaze B2 (10 GB free), Cloudflare R2 (10 GB free), or AWS S3.
- **Another machine**: rsync the backup folder to another PC on your network, or to a friend's server.
- **Cloud sync**: Drop the backup folder into your Dropbox/Google Drive folder.

Example with rclone to Backblaze B2 (after `rclone config`):
```bash
# Append to scripts/backup.sh after the gzip line:
rclone copy "$BACKUP_DIR" "b2:my-ito-backups/" --include 'custom-*.db.gz' --transfers 4
```

### Test your backups

A backup you haven't restored is a wish, not a backup. Once a month:
1. Stop the app: `pm2 stop ito-olympics`
2. Copy a recent backup over the live DB: `gunzip -c /path/to/backup.db.gz > db/custom.db`
3. Start the app: `pm2 start ito-olympics`
4. Sign in and verify data looks right.
5. Restore the real DB the same way (or restore the backup file you just tested onto a fresh copy).

---

## 9. Updating the app

When you pull new code (or push your own changes):

```bash
cd ~/road-to-it-olympics
git pull            # or rsync from your dev machine

# Install any new dependencies
bun install

# Apply any schema changes (additive — preserves existing data)
bun run db:push

# Rebuild
bun run build

# Restart
pm2 restart ito-olympics
```

**Before pulling**: take a fresh backup. Schema migrations are usually safe, but a backup costs nothing.

---

## 10. Monitoring

### Basic health check

Add a health-check script that pings the app and alerts you if it's down. Create `scripts/healthcheck.sh`:

```bash
#!/usr/bin/env bash
# Add to crontab: */5 * * * * /home/YOURUSER/road-to-it-olympics/scripts/healthcheck.sh
set -euo pipefail

URL="http://127.0.0.1:3000/api/rpc"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK"  # optional

if ! curl -sf -X POST "$URL" -H 'content-type: application/json' \
        -d '{"action":"getCurrentUser","args":[]}' >/dev/null 2>&1; then
  # App is down — try to restart
  pm2 restart ito-olympics || true
  sleep 5

  # Re-check
  if curl -sf -X POST "$URL" -H 'content-type: application/json' \
          -d '{"action":"getCurrentUser","args":[]}' >/dev/null 2>&1; then
    MSG=":white_check_mark: ITO Olympics auto-recovered after restart"
  else
    MSG=":rotating_light: ITO Olympics is DOWN and auto-restart failed. Needs manual intervention."
  fi

  # Optionally ping Discord
  if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -sf -X POST "$DISCORD_WEBHOOK_URL" \
      -H 'content-type: application/json' \
      -d "{\"content\":\"$MSG\"}" || true
  fi

  echo "$(date): $MSG"
fi
```

```bash
chmod +x scripts/healthcheck.sh
crontab -e
# Add: */5 * * * * /home/YOURUSER/road-to-it-olympics/scripts/healthcheck.sh >> /home/YOURUSER/backups/ito-olympics/health.log 2>&1
```

### Discord webhook for downtime alerts

Create a Discord channel for ops alerts, add a webhook (channel settings → Integrations → Webhooks), paste the URL into the script above. Now you get a ping on the Discord server when the app goes down.

### pm2 monitoring

- `pm2 monit` — interactive dashboard of CPU/memory
- `pm2 logs` — tail logs in real-time
- The logs are in `~/.pm2/logs/ito-olympics-out.log` and `~/.pm2/logs/ito-olympics-error.log`

---

## 11. User management in production

Once you're live with real students:

1. **Sign in as admin** (`admin@ito.test` — change the password first!).
2. Go to **Manage Users → New account** and create real student accounts. Use their school email or a made-up `@ito.test` address — the email just needs to be unique.
3. **Assign captains** per domain (click `+ assign` next to a student's row).
4. Tell each student to sign in and change their avatar + nickname on the Profile screen.

When a student leaves the club, delete their account from Manage Users. Their submissions stay (for audit) but their account can no longer sign in. Actually — currently deleting a user cascades and deletes their submissions too. If you want to preserve audit history, instead **change their role to something inert** or just change their password to a random string and leave the account in place.

---

## 12. Discord integration (optional)

The concept doc mentions Discord as the social layer (group chat, trivia nights, banter). The app doesn't have native Discord integration — they're separate systems. Suggested setup:

- One Discord server for the delegation, with channels per domain (#java, #db, #web, etc.) plus general/social.
- The Discord is for conversation only — milestones, scores, and dashboards stay inside the app where they're structured and role-scoped.
- The health-check script above can ping a dedicated `#ops-alerts` channel when the server has issues.

---

## 13. Disaster recovery

If the server's disk dies and you need to rebuild:

1. Spin up a new machine.
2. Follow steps 1-4 above (install Bun, clone repo, configure `.env`, `bun install`, `bun run db:push`).
3. **Don't seed** — that would create demo data overwriting your real users.
4. Stop the app: `pm2 stop ito-olympics`.
5. Restore your most recent backup: `gunzip -c /path/to/backup.db.gz > db/custom.db`.
6. Start the app: `pm2 start ito-olympics`.
7. Verify by signing in with a real account.

If you only lost the app code (DB intact), skip steps 4-6 — just rebuild and restart.

---

## 14. Common issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `attempt to write a readonly database` | The dev server's Prisma client is holding a stale connection from a previous run, OR file permissions are wrong. | Restart the dev server. For production, check `ls -la db/custom.db` — your user should own it. |
| Students can sign in but RPC calls return 500 | Most often a Prisma schema mismatch — the DB was seeded with an older schema. | Run `bun run db:push` to apply current schema. |
| `Invalid Server Actions request` in logs | The reverse proxy isn't forwarding the `X-Forwarded-Host` header. | Add `header_up X-Forwarded-Host {host}` to your Caddy reverse_proxy block. (This app uses an RPC endpoint instead of Server Actions specifically to avoid this — but if you see it, that's the cause.) |
| Login redirects but doesn't sign in | Cookie not being set — usually because the app is on HTTP but the cookie is `secure: true`. | For HTTP-only LAN deployments, set `secure: false` in `src/lib/auth.ts`'s `createSession` function. For HTTPS deployments (recommended), no change needed. |
| Streaks show 0 for everyone | Most often: the streak engine is correctly skipping weeks because no milestones are active in those weeks. | Make sure you have at least one `status: 'active'` milestone per domain, created before the current Manila week. |
| App feels slow | SQLite is usually fast for this scale, but if submissions pile up over a long season, leaderboard computation can slow down (it iterates every student × every domain). | For a club of 50 students × 6 domains, you won't notice. For 500+, consider adding indexes or caching the leaderboard result for 60 seconds. |

---

## 15. Pre-launch checklist

Before you tell students to sign in:

- [ ] `.env` has a strong `SESSION_SECRET` (32+ random hex chars)
- [ ] `.env` is `chmod 600` and not in git
- [ ] `bun run db:push` and `bun run scripts/seed.ts` ran cleanly
- [ ] `bun run build` produced a standalone server
- [ ] pm2 is running the app and `pm2 startup` was configured
- [ ] Caddy (or your tunnel) is up and the app is reachable from a student device
- [ ] HTTPS works (or you've consciously decided on HTTP for LAN-only)
- [ ] Backup script is in place, cron is scheduled, **and you've successfully restored from a backup at least once**
- [ ] Health-check script is in place (if using Discord alerts, the webhook works)
- [ ] Admin password changed from the seed default
- [ ] Real student accounts created, captains assigned
- [ ] At least one active milestone per domain for the current week

---

## 16. Quick reference

```bash
# Start / stop / restart the app
pm2 start ito-olympics
pm2 stop ito-olympics
pm2 restart ito-olympics

# Tail logs
pm2 logs ito-olympics

# Apply schema changes after a code update
bun run db:push

# Take a manual backup
bash scripts/backup.sh

# Restore from backup (stops the app first!)
pm2 stop ito-olympics
gunzip -c /path/to/backup.db.gz > db/custom.db
pm2 start ito-olympics

# Reload Caddy after a config change
sudo systemctl reload caddy

# Check what's listening on which port
sudo ss -tlnp | grep -E ':(80|443|3000)\s'
```

---

## 17. Where things live

| Path | What |
|------|------|
| `db/custom.db` | The SQLite database — back this up |
| `.env` | Secrets (DB path, session secret) |
| `prisma/schema.prisma` | Database schema — version in git |
| `scripts/seed.ts` | Initial seed data — run once |
| `scripts/backup.sh` | Your backup script |
| `ecosystem.config.cjs` | pm2 config |
| `/etc/caddy/Caddyfile` | Reverse proxy config |
| `~/.pm2/logs/` | pm2 log files |

---

## 18. When to call it

The season ends in November. After the competition:

- Keep the app running through the end of the month so students can see their final stats.
- Take a final backup and store it somewhere permanent (a USB drive in a drawer, an archive in cloud storage) — this is your historical record of the season.
- The app can stay up indefinitely for reference, or you can shut it down. If you shut it down, the data lives in your backup — you can always restore it next year when season 16 starts.

Good luck in November.
