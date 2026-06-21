// src/lib/discord.ts
//
// Discord Incoming Webhook integration for Road to IT Olympics.
//
// HOW TO SET UP:
//   1. Open your Discord server → Server Settings → Integrations → Webhooks
//   2. Click "New Webhook" → choose the target channel (#ito-alerts)
//   3. Copy the Webhook URL
//   4. Set it as DISCORD_WEBHOOK_URL in your environment (docker-compose.yml / .env.local)
//   5. Never commit the URL to source control.
//
// HOW TO TEST LOCALLY:
//   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/TOKEN \
//   APP_PUBLIC_URL=http://localhost:3000 \
//   bun run scripts/test-discord.ts
//
// ENVIRONMENT VARIABLES:
//   DISCORD_WEBHOOK_URL   — Required. The full webhook URL from Discord.
//   APP_PUBLIC_URL        — Optional. Used for the "View Leaderboard" button.
//                           Defaults to http://localhost:3000.

type DiscordField = {
  name: string
  value: string
  inline?: boolean
}

type DiscordEmbed = {
  title: string
  description?: string
  color: number
  fields?: DiscordField[]
  footer?: { text: string }
  timestamp?: string
  url?: string
}

// Color palette — integer values required by Discord API
export const DISCORD_COLORS = {
  RED:    15158332,  // #E74C3C — downtime / error
  GREEN:  3066993,   // #2ECC71 — recovery / success
  BLUE:   3447003,   // #3498DB — leaderboard update
  GOLD:   15844367,  // #F1C40F — new milestone
  GREY:   9807270,   // #95A5A6 — informational
} as const

async function sendEmbed(embed: DiscordEmbed): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) {
    // Silently skip in environments without the webhook configured.
    // Log a dev-friendly warning so it's obvious during local testing.
    console.warn('[discord] DISCORD_WEBHOOK_URL not set — notification skipped.')
    return
  }

  const payload = {
    embeds: [
      {
        ...embed,
        timestamp: embed.timestamp ?? new Date().toISOString(),
        footer: embed.footer ?? { text: 'Road to IT Olympics · ISPSC Tagudin' },
      },
    ],
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),  // 8s timeout — Discord is usually <1s
    })

    if (!res.ok) {
      // 429 = rate-limited, 4xx = bad payload, 5xx = Discord outage
      const body = await res.text().catch(() => '(no body)')
      console.error(`[discord] Webhook returned ${res.status}: ${body}`)
    }
  } catch (err) {
    // Network failure, timeout, or abort — log and continue. Never rethrow.
    console.error('[discord] Failed to send notification:', err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DiscordAlertType =
  | 'downtime'
  | 'recovery'
  | 'leaderboard'
  | 'milestone-published'
  | 'milestone-activated'

export type DiscordAlertData = {
  // downtime
  errorDetail?: string
  statusCode?: number
  // recovery
  downtimeDuration?: string  // e.g. "3 minutes 42 seconds"
  // leaderboard
  top3?: Array<{ rank: number; nickname: string; bestStreak: number; weeksCompleted: number }>
  // milestone
  milestoneTitle?: string
  milestoneDomain?: string
  milestoneMode?: string
  milestoneDifficulty?: string
  milestonePhase?: string
  createdBy?: string
}

export async function sendDiscordAlert(
  type: DiscordAlertType,
  data: DiscordAlertData = {}
): Promise<void> {
  const appUrl = process.env.APP_PUBLIC_URL ?? 'http://localhost:3000'

  switch (type) {
    // ── Event 1: Server Downtime ──────────────────────────────────────────
    case 'downtime':
      return sendEmbed({
        color: DISCORD_COLORS.RED,
        title: '🚨 Server Downtime Detected',
        description: data.errorDetail
          ? `**Error:** ${data.errorDetail}${data.statusCode ? ` (HTTP ${data.statusCode})` : ''}`
          : 'The server is not responding to health checks.',
        fields: [
          { name: 'Status', value: '🔴 Offline', inline: true },
          { name: 'Detected at', value: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), inline: true },
        ],
        footer: { text: 'Automated System Alert · Health Monitor' },
      })

    // ── Event 1b: Server Recovery ─────────────────────────────────────────
    case 'recovery':
      return sendEmbed({
        color: DISCORD_COLORS.GREEN,
        title: '✅ Server Back Online',
        description: data.downtimeDuration
          ? `Service restored. Total downtime: **${data.downtimeDuration}**.`
          : 'Service has recovered and is responding normally.',
        fields: [
          { name: 'Status', value: '🟢 Online', inline: true },
          { name: 'Restored at', value: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), inline: true },
        ],
        footer: { text: 'Automated System Alert · Health Monitor' },
      })

    // ── Event 2: Leaderboard Update ───────────────────────────────────────
    case 'leaderboard': {
      const top3 = data.top3 ?? []
      const medals = ['🥇', '🥈', '🥉']
      return sendEmbed({
        color: DISCORD_COLORS.BLUE,
        title: '🏆 Leaderboard Updated',
        description: 'The streak leaderboard has been refreshed. Here are the current top performers:',
        url: `${appUrl}`,   // Discord makes the title a clickable link when url is set
        fields: [
          ...top3.map((entry, i) => ({
            name: `${medals[i] ?? `#${entry.rank}`} ${entry.nickname}`,
            value: `🔥 **${entry.bestStreak}** week streak · ${entry.weeksCompleted} weeks completed`,
            inline: false,
          })),
          top3.length === 0
            ? { name: 'No data yet', value: 'Leaderboard will update as students submit.', inline: false }
            : { name: '📊 View Full Leaderboard', value: `[Open the app](${appUrl})`, inline: false },
        ],
        footer: { text: 'Road to IT Olympics · Streak Leaderboard' },
      })
    }

    // ── Event 3a: Milestone Published (created as active) ─────────────────
    case 'milestone-published':
    // ── Event 3b: Milestone Activated (draft → active) ────────────────────
    case 'milestone-activated': {
      const difficultyEmoji: Record<string, string> = {
        easy: '🟢', average: '🟡', difficult: '🔴',
      }
      const modeEmoji: Record<string, string> = {
        tutor: '📖', assessment: '📝', journal: '✏️',
      }
      const diff = data.milestoneDifficulty ?? 'unknown'
      const mode = data.milestoneMode ?? 'unknown'
      return sendEmbed({
        color: DISCORD_COLORS.GOLD,
        title: `🚀 New Milestone Unlocked: ${data.milestoneTitle ?? 'Untitled'}`,
        description: `A new milestone is now **active** and ready for submissions.`,
        url: `${appUrl}`,
        fields: [
          { name: '📂 Domain',     value: data.milestoneDomain ?? '—', inline: true },
          { name: `${modeEmoji[mode] ?? '📄'} Mode`, value: mode.charAt(0).toUpperCase() + mode.slice(1), inline: true },
          { name: `${difficultyEmoji[diff] ?? '⚪'} Difficulty`, value: diff.charAt(0).toUpperCase() + diff.slice(1), inline: true },
          { name: '📅 Phase / Week', value: data.milestonePhase ?? '—', inline: true },
          { name: '👤 Published by', value: data.createdBy ?? '—', inline: true },
          { name: '📌 Action', value: `[Open milestones](${appUrl})`, inline: true },
        ],
        footer: { text: 'Keep up the great work! · Road to IT Olympics' },
      })
    }

    default:
      console.warn(`[discord] Unknown alert type: ${type as string}`)
  }
}
