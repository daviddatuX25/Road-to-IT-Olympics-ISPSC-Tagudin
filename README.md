# Road to IT Olympics (RIO) — The Forge 🚀

A robust, PWA-enabled training, practice-tracking, and evaluation platform built for the **15th IT Skills Olympics** (ISPSC Tagudin).

The platform uses a low-stakes, AI-guided weekly practice loop that encourages consistent habit building over raw scores, backed by a secure selection tool for coaches to finalize candidates under simulated proctored contest conditions.

---

## 📖 Table of Contents
1. [Core Philosophy](#-core-philosophy)
2. [Key Features](#%EF%B8%8F-key-features)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Getting Started (Local Setup)](#-getting-started-local-setup)
6. [Testing with Docker](#-testing-with-docker)
7. [Discord Webhook Notifications](#-discord-webhook-notifications)
8. [Production Deployment](#-production-deployment)

---

## 🎯 Core Philosophy

- **Low-Stakes Practice, High-Stakes Selection:** Day-to-day practice is self-reported and AI-evaluated, keeping friction low and encouraging honest exploration. The final delegation selection is determined by proctored mock contests run under real contest constraints.
- **Cheating-Proof by Design:** If a candidate games their practice metrics, they fail to gain real skills, which gets flagged immediately during the offline, proctored mock contests.
- **Leaderboard for Streaks, Not Scores:** The public leaderboard ranks students based on consistency (streaks) and milestone completions, never AI-graded points, preventing counter-productive competition anxiety and gaming.

---

## 🛠️ Key Features

- **Six Domain Modules:** Tailored templates and rules for Java Programming, Web Design, Database Management, IT Quiz Bee, Python, and Computer Networking.
- **PWA & Offline-First Mode:**
  - Network-first caching strategies for static resources and API calls.
  - An IndexedDB-based local outbox queue to queue submissions when offline.
  - Automatic background synchronization/replay (FIFO replay) on reconnect.
  - Live offline banners and status badges (syncing, offline, sync issue).
- **Discord Integration:** Automated alerts for:
  - Weekly milestone publishing and activations.
  - Leaderboard refreshes (Top 3 performers).
  - Standalone service monitoring for server downtime and recovery alerts.
- **Candidate Evaluation Panel:** Private, Role-Based Access Control (RBAC) panel for coaches and domain captains to analyze candidate records, practice history, and log manual evaluation runs.

---

## 💻 Tech Stack

- **Frontend & Backend Framework:** Next.js (App Router, Server Actions)
- **Runtime Environment:** Bun
- **Database & ORM:** SQLite + Prisma ORM
- **State Management:** Zustand
- **Styling & Animation:** Tailwind CSS + Radix UI + Framer Motion + Sonner Toasts
- **PWA Features:** Service Workers (Workbox-free vanilla sw.js) + IndexedDB
- **Process Orchestration:** Docker & Docker Compose

---

## 📂 Project Structure

```
├── components.json             # Shadcn configuration
├── docker-compose.yml          # Local and production compose services
├── Dockerfile                  # Multi-stage production build script
├── Caddyfile                   # Reverse proxy configuration for SSL/HTTP redirection
├── prisma/                     # Database schemas and seed data
│   └── schema.prisma
├── public/                     # Static assets, PWA icons, manifest, and Service Worker
│   ├── sw.js                   # Offline caching & background outbox sync
│   └── manifest.json           # Progressive Web App configuration
├── docs/                       # Project sitemaps, konsep docs, and handoff guides
│   ├── initial_conceept.md     # Initial design strategy & domain rules
│   └── handoff_deployment_notes.md # Deployment notes copy
├── scripts/                    # Management scripts (seeding, uptime-monitors, discord-test)
│   ├── uptime-monitor.ts       # Standalone uptime monitor script
│   ├── test-discord.ts         # Utility to test discord embed templates
│   └── seed.ts                 # Full database seed script
└── src/
    ├── app/                    # Next.js App Router (Views, API endpoints)
    ├── components/             # Reusable UI component libraries
    ├── hooks/                  # PWA offline, useConnectivity, and useSync hooks
    └── lib/                    # Core modules (API Client, IndexedDB, Discord)
```

---

## 🚀 Getting Started (Local Setup)

To run the application locally without Docker:

### 1. Prerequisites
Ensure you have [Bun](https://bun.sh) installed.

### 2. Installation
```bash
# Clone the repository and install dependencies
bun install
```

### 3. Database Initialization
```bash
# Generate Prisma clients and push schema to SQLite DB
bun db:generate
bun db:push

# Optional: seed the database with mock domains, milestones, and users
bun run scripts/seed.ts
```

### 4. Run Development Server
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Testing with Docker

To test the application in a production-like containerized setup:

```bash
# Start the application services in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f rio

# Destroy containers and clean up DB volumes
docker compose down -v
```
When running via Docker Compose:
- **Next.js app** is available directly at `http://localhost:3000` (development/debugging).
- **Caddy proxy** terminates at `http://localhost:81` (production replica entrypoint).

---

## 🔔 Discord Webhook Notifications

To receive real-time notifications in your Discord server:

1. Open your Discord Server ➜ **Server Settings** ➜ **Integrations** ➜ **Webhooks**.
2. Click **Create Webhook**, choose the target channel, and click **Copy Webhook URL**.
3. Create a `.env` file in the root directory (or inject variables via Docker Compose):
   ```env
   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your-webhook-token"
   APP_PUBLIC_URL="http://localhost:81"
   ```
4. Test that the webhook integration is wired correctly:
   ```bash
   bun run scripts/test-discord.ts
   ```

---

## 🌐 Production Deployment

The production build targets **Dokploy** (or any VM hosting Docker Compose / Coolify).

* Secure cookies are enforced in production (`NODE_ENV=production`), meaning **login will fail over plain HTTP**. You must deploy using a domain with SSL/TLS enabled.
* The SQLite database file resides at `/app/db/custom.db` and must be mapped to a persistent Docker volume (`rio-db`) to prevent data loss.

For detailed step-by-step instructions on setting up your VM, configuring Dokploy environment variables, and establishing persistence, refer to the official handoff guide:
👉 **[docs/handoff_deployment_notes.md](file:///home/user/Downloads/RIO/docs/handoff_deployment_notes.md)**
