import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { db } from './db'

// --- Password hashing (Node built-in scrypt) -------------------------------
const SALT_LEN = 16
const KEY_LEN = 32
const SCRYPT_N = 16384

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN)
  const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N })
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'base64')
  const expected = Buffer.from(parts[2], 'base64')
  const actual = crypto.scryptSync(password, salt, expected.length, { N: SCRYPT_N })
  return crypto.timingSafeEqual(expected, actual)
}

// --- Session ----------------------------------------------------------------
// Simple HMAC-signed cookie. Not as full-featured as NextAuth but enough for a
// club app and easy to reason about.
const SESSION_COOKIE = 'ito_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14 // 14 days

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    // Fallback for dev — generate one and cache on the globalThis
    const g = globalThis as unknown as { __itoSessionSecret?: string }
    if (!g.__itoSessionSecret) {
      g.__itoSessionSecret = crypto.randomBytes(32).toString('hex')
    }
    return g.__itoSessionSecret
  }
  return secret
}

function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', sessionSecret())
  hmac.update(payload)
  return hmac.digest('base64url')
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `${userId}.${expiresAt}`
  const sig = sign(payload)
  const token = `${payload}.${sig}`
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',  // tighten from 'lax' to 'strict' — prevents CSRF from external sites
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export type SessionUser = {
  id: string
  email: string
  role: 'admin' | 'instructor' | 'student'
  nickname: string
  realName: string | null
  studentId: string | null
  avatarId: string
  captainOf?: Array<{
    domainId: string
    domain: {
      id: string
      key: string
      name: string
    }
  }>
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, expStr, sig] = parts
  const payload = `${userId}.${expStr}`
  if (sign(payload) !== sig) return null
  const exp = Number.parseInt(expStr, 10)
  if (Number.isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return null

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      nickname: true,
      realName: true,
      studentId: true,
      avatarId: true,
      captainOf: {
        select: {
          domainId: true,
          domain: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      },
    },
  })
  if (!user) return null
  return user as SessionUser
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) throw new Error('NOT_AUTHENTICATED')
  return user
}

export async function requireRole(...roles: SessionUser['role'][]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN')
  return user
}

export async function isCaptainOf(userId: string, domainId: string): Promise<boolean> {
  const row = await db.domainCaptain.findUnique({
    where: { userId_domainId: { userId, domainId } },
  })
  return !!row
}
