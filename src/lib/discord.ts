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
        title: '🚨 System Alert: Server Offline',
        description: `### Urgent: Server is not responding to health checks.\n\n` +
          `❌ **Error detail:** \`${data.errorDetail || 'Connection timeout / No response'}\`${data.statusCode ? ` (HTTP ${data.statusCode})` : ''}`,
        fields: [
          { name: '🔴 Status', value: 'Offline', inline: true },
          { name: '📅 Time (PHT)', value: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), inline: true },
        ],
        footer: { text: 'Automated Health Monitor · Road to IT Olympics' },
      })

    // ── Event 1b: Server Recovery ─────────────────────────────────────────
    case 'recovery':
      return sendEmbed({
        color: DISCORD_COLORS.GREEN,
        title: '✅ System Alert: Server Restored',
        description: `### Online: Service has recovered and is responding normally.\n\n` +
          `🟢 **Recovery status:** Service restored successfully.` + 
          (data.downtimeDuration ? `\n⏳ **Total downtime:** \`${data.downtimeDuration}\`` : ''),
        fields: [
          { name: '🟢 Status', value: 'Online', inline: true },
          { name: '📅 Restored at (PHT)', value: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), inline: true },
        ],
        footer: { text: 'Automated Health Monitor · Road to IT Olympics' },
      })

    // ── Event 2: Leaderboard Update ───────────────────────────────────────
    case 'leaderboard': {
      const top3 = data.top3 ?? []
      const medals = ['🥇', '🥈', '🥉']
      const standingsList = top3.map((entry, i) => {
        return `${medals[i] ?? `#${entry.rank}`} **${entry.nickname}**\n` +
               `┗ 🔥 **${entry.bestStreak}** week streak  •  ✅ **${entry.weeksCompleted}** weeks completed`
      }).join('\n\n')

      return sendEmbed({
        color: DISCORD_COLORS.BLUE,
        title: '🏆 Leaderboard Refreshed',
        description: `### Weekly Streak Standings\n\n` +
          (standingsList || '*No active student streaks yet. Submit milestones to claim the top spot!*'),
        url: `${appUrl}`,
        fields: [
          { name: '📊 View Full Leaderboard', value: `👉 [Open Leaderboard & Check Standings](${appUrl})`, inline: false }
        ],
        footer: { text: 'ISPSC Tagudin Campus · Streak Leaderboard' },
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
      const formattedDiff = diff.charAt(0).toUpperCase() + diff.slice(1)
      const formattedMode = mode.charAt(0).toUpperCase() + mode.slice(1)

      return sendEmbed({
        color: DISCORD_COLORS.GOLD,
        title: `🚀 New Milestone Active: ${data.milestoneTitle ?? 'Untitled'}`,
        description: `### A new milestone has been unlocked for the ISPSC Tagudin delegation!\n\n` +
          `📂 **Domain:** ${data.milestoneDomain ?? '—'}\n` +
          `${modeEmoji[mode] ?? '📄'} **Mode:** ${formattedMode}\n` +
          `${difficultyEmoji[diff] ?? '⚪'} **Difficulty:** ${formattedDiff}\n` +
          `📅 **Phase:** ${data.milestonePhase ?? '—'}\n\n` +
          `*Published by **${data.createdBy || 'System'}***`,
        url: `${appUrl}`,
        fields: [
          { name: '✍️ Submissions Open', value: `👉 [Go to Platform & Start Practice](${appUrl})`, inline: false }
        ],
        footer: { text: 'Keep practicing! · Road to IT Olympics' },
      })
    }

    default:
      console.warn(`[discord] Unknown alert type: ${type as string}`)
  }
}
