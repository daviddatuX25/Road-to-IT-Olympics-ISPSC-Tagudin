'use client'

import { useEffect, useState, useCallback } from 'react'

export type ThemeKey = 'olympics' | 'cyberpunk' | 'formal' | 'terminal'

export const THEMES: Array<{ key: ThemeKey; label: string; description: string; swatch: string[] }> = [
  {
    key: 'olympics',
    label: 'Olympics',
    description: 'Warm green on cream — the brand default.',
    swatch: ['#16a34a', '#fefce8', '#1c1917'],
  },
  {
    key: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Neon cyan + magenta on near-black. Late-night practice vibes.',
    swatch: ['#22d3ee', '#ec4899', '#0a0a1a'],
  },
  {
    key: 'formal',
    label: 'Formal',
    description: 'Slate blue on warm white. Clean and professional.',
    swatch: ['#475569', '#ffffff', '#1e293b'],
  },
  {
    key: 'terminal',
    label: 'Terminal',
    description: 'Amber on near-black, monospace. Vim vibes for coders.',
    swatch: ['#fbbf24', '#1a1a0a', '#fbbf24'],
  },
]

const STORAGE_KEY = 'ito-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeKey>('olympics')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeKey | null
      if (stored && THEMES.some(t => t.key === stored)) {
        setThemeState(stored)
        applyTheme(stored)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  const setTheme = useCallback((t: ThemeKey) => {
    setThemeState(t)
    applyTheme(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // ignore
    }
  }, [])

  return { theme, setTheme }
}

function applyTheme(t: ThemeKey) {
  const html = document.documentElement
  if (t === 'olympics') {
    // Default — remove data-theme attribute so :root applies
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', t)
  }
}
