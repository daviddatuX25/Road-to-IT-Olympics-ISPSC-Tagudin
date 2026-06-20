// Fixed avatar set — 12 simple glyphs with distinct colors. Hand-drawn/custom
// art can replace this later without touching the data model (avatarId stays).

export type Avatar = {
  id: string
  label: string
  glyph: string   // emoji or single character — fast, no asset pipeline
  color: string   // background color (Tailwind-safe hex)
}

export const AVATARS: Avatar[] = [
  { id: 'avatar-01', label: 'Tiger',     glyph: '🐯', color: '#f59e0b' },
  { id: 'avatar-02', label: 'Phoenix',   glyph: '🦅', color: '#ef4444' },
  { id: 'avatar-03', label: 'Wolf',      glyph: '🐺', color: '#64748b' },
  { id: 'avatar-04', label: 'Owl',       glyph: '🦉', color: '#8b5cf6' },
  { id: 'avatar-05', label: 'Fox',       glyph: '🦊', color: '#ea580c' },
  { id: 'avatar-06', label: 'Bear',      glyph: '🐻', color: '#92400e' },
  { id: 'avatar-07', label: 'Panda',     glyph: '🐼', color: '#334155' },
  { id: 'avatar-08', label: 'Shark',     glyph: '🦈', color: '#0ea5e9' },
  { id: 'avatar-09', label: 'Dragon',    glyph: '🐉', color: '#16a34a' },
  { id: 'avatar-10', label: 'Hawk',      glyph: '🦅', color: '#7c3aed' },
  { id: 'avatar-11', label: 'Bee',       glyph: '🐝', color: '#eab308' },
  { id: 'avatar-12', label: 'Otter',     glyph: '🦦', color: '#0891b2' },
]

export const AVATAR_MAP: Record<string, Avatar> = Object.fromEntries(
  AVATARS.map(a => [a.id, a]),
)

export function getAvatar(id: string | null | undefined): Avatar {
  if (id && AVATAR_MAP[id]) return AVATAR_MAP[id]
  return AVATARS[0]
}
