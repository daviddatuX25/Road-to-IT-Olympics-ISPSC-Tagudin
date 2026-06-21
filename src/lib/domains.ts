// Domain metadata and the season calendar (handoff §1, concept doc "The calendar").

import {
  Database, Code2, Brain, Globe, Terminal, Network, Trophy,
  type LucideIcon,
} from 'lucide-react'

export const DOMAINS = [
  { key: 'db',     name: 'Database Management', shortName: 'DB', description: 'SQL fluency under time pressure.', color: '#0ea5e9', icon: 'Database', practiceNote: 'Raw mysql CLI reps + timed screenshot-to-Word documentation.', contestFormat: 'XAMPP + mysql CLI, screenshots in Word doc, fastest correct wins.', pairBased: false },
  { key: 'java',   name: 'Java Programming',    shortName: 'Java', description: 'Notepad + CLI only.', color: '#ea580c', icon: 'Code2', practiceNote: 'No IDE from week one. Practice in Notepad + javac in pairs.', contestFormat: '6 problems, 2 hours, Notepad + CLI, pair-based.', pairBased: true },
  { key: 'quiz',   name: 'IT Quiz Bee',         shortName: 'Quiz', description: 'Broad recall fluency.', color: '#8b5cf6', icon: 'Brain', practiceNote: 'Broad recall fluency first.', contestFormat: 'Elimination round → tiered final.', pairBased: true },
  { key: 'web',    name: 'Web Design',          shortName: 'Web', description: 'HTML/CSS only.', color: '#ec4899', icon: 'Globe', practiceNote: 'Fast, decisive, hand-coded layout.', contestFormat: '1 themed page, 2 hours, HTML/CSS only, Notepad++.', pairBased: false },
  { key: 'python', name: 'Python Programming',  shortName: 'Python', description: 'Mechanics TBD.', color: '#16a34a', icon: 'Terminal', practiceNote: 'Mechanics TBD.', contestFormat: 'TBD.', pairBased: false },
  { key: 'net',    name: 'Computer Networking', shortName: 'Net', description: 'Mechanics TBD.', color: '#f59e0b', icon: 'Network', practiceNote: 'Mechanics TBD.', contestFormat: 'TBD.', pairBased: false },
]

export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  Database,
  Code2,
  Brain,
  Globe,
  Terminal,
  Network,
  Trophy,
}

export function getDomainIcon(name: string): LucideIcon {
  return DOMAIN_ICONS[name] || Trophy
}

export function domainMeta(key: string) {
  const d = DOMAINS.find(x => x.key === key) || DOMAINS[0]
  return {
    ...d,
    icon: getDomainIcon(d.icon)
  }
}

// --- Season phases -----------------------------------------------------------
export type PhaseKey =
  | 'july-diagnostic'
  | 'aug-w1'
  | 'aug-w2'
  | 'aug-w3'
  | 'aug-w4'
  | 'sep-w1'
  | 'sep-w2'
  | 'sep-w3'
  | 'sep-w4'
  | 'oct-sprint'
  | 'nov-final'

export type Phase = {
  key: PhaseKey
  label: string
  shortLabel: string
  description: string
  isMockHeavy: boolean
}

export const PHASES: Phase[] = [
  { key: 'july-diagnostic', label: 'July — Diagnostic Week',        shortLabel: 'July',     description: 'Diagnostic per domain to find natural strengths. Open trivia nights to recruit.', isMockHeavy: false },
  { key: 'aug-w1',          label: 'August W1 — Practice Starts',    shortLabel: 'Aug W1',  description: 'Captains per domain take the lead. Real practice cycles begin.', isMockHeavy: false },
  { key: 'aug-w2',          label: 'August W2 — Practice',           shortLabel: 'Aug W2',  description: 'Weekly reps continue. Spaced-repetition callbacks to earlier material.', isMockHeavy: false },
  { key: 'aug-w3',          label: 'August W3 — First Scrimmage',    shortLabel: 'Aug W3',  description: 'First scrimmage under timed conditions.', isMockHeavy: true },
  { key: 'aug-w4',          label: 'August W4 — Practice',           shortLabel: 'Aug W4',  description: 'Continue reps. Captains review scrimmage gaps.', isMockHeavy: false },
  { key: 'sep-w1',          label: 'September W1 — Practice',        shortLabel: 'Sep W1',  description: 'Practice continues. Lighter load if exam season overlaps, but milestones stay consistent — consistency is mastery.', isMockHeavy: false },
  { key: 'sep-w2',          label: 'September W2 — Practice',        shortLabel: 'Sep W2',  description: 'Practice continues. Spaced-repetition callbacks to August material.', isMockHeavy: false },
  { key: 'sep-w3',          label: 'September W3 — Practice',        shortLabel: 'Sep W3',  description: 'Practice continues. Optional async milestones if exam season is heavy — but the streak still expects a submission.', isMockHeavy: false },
  { key: 'sep-w4',          label: 'September W4 — Practice',        shortLabel: 'Sep W4',  description: 'Practice continues. Last week before October sprint — keep the rhythm.', isMockHeavy: false },
  { key: 'oct-sprint',      label: 'October — Intensive Sprint',     shortLabel: 'Oct',     description: 'Full-dress mock contests in real restricted environment. Pairs finalized.', isMockHeavy: true },
  { key: 'nov-final',       label: 'November — Final Taper',         shortLabel: 'Nov',     description: 'High-frequency mocks for speed and nerves, then light review and real rest.', isMockHeavy: true },
]

export const PHASE_MAP: Record<PhaseKey, Phase> = Object.fromEntries(
  PHASES.map(p => [p.key, p]),
) as Record<PhaseKey, Phase>

export function phaseLabel(key: string): string {
  return PHASE_MAP[key as PhaseKey]?.label ?? key
}

// --- Mode + difficulty (mirroring the contest's own tiers) ------------------
export const MODES = [
  { key: 'tutor',       label: 'Tutor',       description: 'AI explains, demonstrates, asks follow-ups. No scoring attached.' },
  { key: 'assessment',  label: 'Assessment',  description: 'Self-assessment with rubric. AI does NOT hand over solutions.' },
  { key: 'journal',     label: 'Journal',     description: 'Reflection-only. No score, just a free-form journal entry.' },
] as const

export const DIFFICULTIES = [
  { key: 'easy',      label: 'Easy',      points: 10, color: '#16a34a' },
  { key: 'average',   label: 'Average',   points: 20, color: '#f59e0b' },
  { key: 'difficult', label: 'Difficult', points: 30, color: '#ef4444' },
] as const

export function difficultyMeta(key: string) {
  return DIFFICULTIES.find(d => d.key === key) ?? DIFFICULTIES[0]
}
export function modeMeta(key: string) {
  return MODES.find(m => m.key === key) ?? MODES[0]
}

// Trophy icon for season branding
export { Trophy }
