#!/usr/bin/env bun
// scripts/test-discord.ts
//
// Usage:
//   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..." bun run scripts/test-discord.ts
//
// Sends one test embed for each notification type so you can verify formatting.

import { sendDiscordAlert } from '../src/lib/discord'

async function main() {
  console.log('Sending test notifications to Discord...\n')

  console.log('  [1/4] Downtime alert...')
  await sendDiscordAlert('downtime', {
    statusCode: 503,
    errorDetail: 'Health check timed out after 8s (TEST)',
  })
  await new Promise(r => setTimeout(r, 1500))  // Discord rate limit: 5 embeds/sec

  console.log('  [2/4] Recovery alert...')
  await sendDiscordAlert('recovery', { downtimeDuration: '3 minutes 42 seconds (TEST)' })
  await new Promise(r => setTimeout(r, 1500))

  console.log('  [3/4] Leaderboard update...')
  await sendDiscordAlert('leaderboard', {
    top3: [
      { rank: 1, nickname: 'lia.exe', bestStreak: 8, weeksCompleted: 12 },
      { rank: 2, nickname: 'byte.boy', bestStreak: 7, weeksCompleted: 11 },
      { rank: 3, nickname: 'nullptr_no', bestStreak: 6, weeksCompleted: 10 },
    ],
  })
  await new Promise(r => setTimeout(r, 1500))

  console.log('  [4/4] New milestone...')
  await sendDiscordAlert('milestone-published', {
    milestoneTitle: 'Java OOP Fundamentals: Interfaces & Abstract Classes',
    milestoneDomain: 'Java Programming',
    milestoneMode: 'assessment',
    milestoneDifficulty: 'difficult',
    milestonePhase: 'aug-w2',
    createdBy: 'JavaCaptain',
  })

  console.log('\n✅ All test notifications sent. Check your Discord channel.')
}

main().catch(console.error)
