# Handoff Guide: Discord Server Setup & Dokploy Deployment

This document provides step-by-step instructions for:
1. **Setting up a Discord server** and configuring the Webhooks to receive system alerts, milestones, and leaderboard updates.
2. **Deploying the RIO app to a home server VM** using **Dokploy** (or Docker Compose), ensuring data persistence and HTTPS termination.
3. **Local Docker testing reference** since we are using Docker containers locally.

---

## ── Part 1: Setting Up the Discord Server ──

Your RIO application includes a built-in webhook notifier (src/lib/discord.ts) that alerts your server of downtime/recovery events, weekly milestone releases, and changes to the top of the leaderboard.

### 1. Create the Discord Server
1. Click the **"+" (Add a Server)** icon at the bottom of your Discord server list.
2. Choose **Create My Own** ➜ **For me and my friends** (or **For a club or community**).
3. Enter a name (e.g., *Road to IT Olympics (ISPSC)*) and upload a server icon. Click **Create**.

### 2. Set Up Recommended Channels
We suggest creating a separate, locked channel for automated system updates so that regular chat doesn't bury critical alerts:
* `#announcements` - General text announcements.
* `#ito-alerts` - **(Recommended for webhook notifications)** Target channel for system health, milestones, and leaderboard embeds. Set channel permissions so that only admins can type/manage, but everyone can read.

### 3. Create the Incoming Webhook
1. Navigate to your Discord server, click on the **Server Name dropdown** in the top left ➜ select **Server Settings**.
2. Go to **Integrations** in the left sidebar.
3. Click the **Webhooks** tile, then click **Create Webhook** (or **New Webhook**).
4. Configure the Webhook:
   * **Name**: `RIO Alert Bot` (or similar)
   * **Channel**: Select `#ito-alerts` (from the channel dropdown)
   * **Avatar**: (Optional) Upload a robot or server logo.
5. Click **Copy Webhook URL**. Save this URL securely (do not commit it to GitHub!).
6. Click **Save Changes**.

### 4. Verify/Test Your Webhook Locally
You can verify that the integration is working and test the formatting of the rich embeds before deploying. From the root of your project:
```bash
# Configure temporary environment variables and run the test script
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your-copied-url-here" \
APP_PUBLIC_URL="http://localhost:81" \
bun run scripts/test-discord.ts
```
*Expected Result:* You will see 4 rich, colored embeds (Downtime Alert, Recovery Notification, Leaderboard Update, and Milestone Released) posted to your `#ito-alerts` channel.

---

## ── Part 2: Deploying to Home Server VM via Dokploy ──

**Dokploy** is a lightweight, open-source alternative to Heroku/Coolify that runs on your own hardware. Since the app is built inside standard Docker containers, deploying on Dokploy is simple and highly robust.

### Prerequisite: Preparing the VM
If you haven't already set up a virtual machine (VM) on your home server:
1. **OS**: Ubuntu 22.04 LTS or 24.04 LTS (Minimal Server installation).
2. **CPU/RAM**: 2 vCPUs and 2GB+ RAM recommended.
3. **Install Docker & Dokploy**:
   Run the official one-liner script on your clean VM to install Docker, Docker Compose, and Dokploy:
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```
4. **Access Dokploy Dashboard**:
   Open a browser and navigate to `http://<your-vm-ip>:3000`. Set up your admin account.

---

### Step 1: Create a Project and App in Dokploy
1. In the Dokploy dashboard, click **Create Project** ➜ Name it `RIO`.
2. Inside the project, click **Create Service** ➜ Choose **Compose** (recommended) or **Application**.
   * **Option A: Compose (Recommended)**: Best for matching local `docker-compose.yml` behavior exactly. You will paste the compose config.
   * **Option B: Application (Dockerfile build)**: Point it directly to your GitHub repository and let Dokploy build it.

---

### Step 2: Configure Environment Variables
In the Dokploy dashboard for your application, navigate to the **Environment** tab and add the following variables:

| Variable | Value / Mode | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables React production optimizations and secure cookies. |
| `PORT` | `3000` | The internal port where Next.js runs. |
| `HOSTNAME` | `0.0.0.0` | Binds Next.js server to all internal network interfaces. |
| `SESSION_SECRET` | *(Generate a unique hex key)* | HMAC key for encrypting sessions. Generate using `openssl rand -hex 32` on your terminal. **Do not use the local dummy key!** |
| `DATABASE_URL` | `file:/app/db/custom.db` | Location of the SQLite database. |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | The Discord URL you copied in Part 1. |
| `APP_PUBLIC_URL` | `https://your-app-domain.com` | Your public domain (used to generate clickable links in Discord embeds). |

---

### Step 3: Configure Domain and SSL (CRITICAL)
Next.js secure session cookies rely on HTTPS. **If HTTPS is not configured, cookies will be rejected by the browser, and login will fail silently.**

1. In the application settings in Dokploy, go to the **Domains** tab.
2. Add your custom domain (e.g., `rio.yourdomain.com`).
3. Turn on the **Proxy** / **TLS** toggles. Dokploy will automatically use its internal Traefik/Caddy proxy to request a free **Let's Encrypt** SSL certificate and redirect all HTTP traffic to HTTPS.
4. Set the **Target Port** to `81` (which is the port Caddy listens on inside the container, proxying to Next.js on 3000).

---

### Step 4: Ensure Database Persistence (Volume Mount)
To prevent your database from being cleared whenever the Docker container updates or restarts, we must mount the DB directory to a persistent volume.

#### If deploying via Compose (Option A):
Your `docker-compose.yml` is already preconfigured to map the database folder:
```yaml
services:
  rio:
    ...
    volumes:
      - rio-db:/app/db
volumes:
  rio-db:
    driver: local
```
Dokploy will automatically parse this and provision a persistent named volume called `rio-db`.

#### If deploying via Application (Option B):
1. Navigate to the **Storage** / **Volumes** tab of your Application.
2. Click **Add Volume**.
3. Set **Destination Path** to `/app/db`.
4. Set **Source Path** (or Volume Name) to `rio-db-volume`. This ensures `/app/db/custom.db` is stored outside the container lifecycle.

---

### Step 5: Run the First Deploy
1. Click **Deploy**. Dokploy will pull the repository/compose config and build the image. On container startup, the database schema is automatically synchronized to match the latest schema.prisma and default seed data is verified.
2. Visit `https://your-app-domain.com` and verify the landing page loads.
3. Test registering a user and logging in to ensure HTTPS cookies are active and working!

---

## ── Part 3: Local Docker Testing Reference ──

Since we test locally using Docker, keep these handy commands in mind for routine management:

```bash
# Start all containers in the background, rebuilding the images if files changed
docker compose up -d --build

# View real-time output from the containers
docker compose logs -f

# Log into the running shell of the web app container to debug database manually
docker compose exec -it rio sh
# inside container:
# npx prisma studio --port 5555  (to explore database via web interface)

# Stop the containers without deleting database volumes
docker compose down

# Stop containers AND wipe database volumes (useful for clean-slate testing)
docker compose down -v
```

---

## ── Troubleshooting Handoff Notes ──

* **Problem**: Users are redirected back to the login page without any feedback.
  * **Cause**: You are accessing the application over HTTP (e.g., `http://your-ip:81`), but `NODE_ENV` is set to `production`. Production requires HTTPS because cookie headers are marked `Secure`.
  * **Fix**: Configure a domain with SSL/TLS in Dokploy. If you must test over plain HTTP/IP, temporarily change `NODE_ENV` to `development` in your env config (remember to toggle it back!).
* **Problem**: Discord alerts are not sending.
  * **Cause**: `DISCORD_WEBHOOK_URL` is either missing from the environment variables, or the Docker container cannot resolve `discord.com` due to VM DNS issues.
  * **Fix**: Double-check the environment variables in Dokploy. You can test network resolution by running `docker compose exec rio curl -I https://discord.com` from your VM shell.
* **Problem**: Leaderboard embeds show `http://localhost:3000` links.
  * **Cause**: `APP_PUBLIC_URL` env variable is missing or wrong.
  * **Fix**: Set `APP_PUBLIC_URL` to your official domain (e.g. `https://rio.yourdomain.com`).
