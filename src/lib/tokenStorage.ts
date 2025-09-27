import type { AuthTokens } from '../context/AuthContext'

const STORAGE_KEY = 'workout-spotify:auth_tokens'

export function saveTokens(tokens: AuthTokens) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  } catch (error) {
    console.error('Failed to persist Spotify tokens', error)
  }
}

export function loadTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthTokens
    if (!parsed?.accessToken || !parsed?.expiresAt) {
      return null
    }
    return parsed
  } catch (error) {
    console.error('Failed to read Spotify tokens from storage', error)
    return null
  }
}

export function clearStoredTokens() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear Spotify tokens from storage', error)
  }
}
