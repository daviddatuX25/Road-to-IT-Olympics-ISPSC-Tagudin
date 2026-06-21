#!/usr/bin/env bun
// scripts/uptime-monitor.ts
//
// Standalone health poller. Run this separately from the main app — on the
// same host, via cron, or as a separate Docker service.
//
// Usage:
//   bun run scripts/uptime-monitor.ts
//
// Environment variables required:
//   DISCORD_WEBHOOK_URL  — The Discord webhook URL
//   HEALTH_CHECK_URL     — URL to probe (default: http://localhost:3000/api/health)
//   POLL_INTERVAL_MS     — How often to check in ms (default: 60000 = 1 min)

import { sendDiscordAlert } from '../src/lib/discord'

const HEALTH_URL   = process.env.HEALTH_CHECK_URL ?? 'http://localhost:3000/api/health'
const POLL_MS      = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10)
const TIMEOUT_MS   = 8000

let wasDown = false
let downtimeStart: Date | null = null

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} second${seconds !== 1 ? 's' : ''}`
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
}

async function probe() {
  try {
    const res = await fetch(HEALTH_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) {
      // Server is reachable but returning an error status
      if (!wasDown) {
        wasDown = true
        downtimeStart = new Date()
        await sendDiscordAlert('downtime', {
          statusCode: res.status,
          errorDetail: `Health check returned HTTP ${res.status}`,
        })
      }
    } else {
      // Server is healthy
      if (wasDown) {
        const duration = downtimeStart ? formatDuration(Date.now() - downtimeStart.getTime()) : undefined
        wasDown = false
        downtimeStart = null
        await sendDiscordAlert('recovery', { downtimeDuration: duration })
      }
    }
  } catch (err) {
    // Network error / timeout — server is unreachable
    if (!wasDown) {
      wasDown = true
      downtimeStart = new Date()
      const msg = err instanceof Error ? err.message : String(err)
      await sendDiscordAlert('downtime', {
        errorDetail: msg.includes('AbortError') || msg.includes('timeout')
          ? `Health check timed out after ${TIMEOUT_MS / 1000}s`
          : msg,
      })
    }
  }
}

console.log(`[uptime-monitor] Polling ${HEALTH_URL} every ${POLL_MS / 1000}s`)
probe()
setInterval(probe, POLL_MS)
