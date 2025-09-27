import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { getSpotifyEnv } from '../lib/env'
import { clearStoredTokens, loadTokens, saveTokens } from '../lib/tokenStorage'

export type AuthTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
  tokenType: string
}

type AuthContextValue = {
  tokens: AuthTokens | null
  setTokens: (tokens: AuthTokens | null) => void
  clearTokens: () => void
  refreshTokens: () => Promise<void>
  isReady: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const REFRESH_BUFFER_MS = 60_000
const MIN_REFRESH_DELAY_MS = 5_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokensState] = useState<AuthTokens | null>(null)
  const [isReady, setIsReady] = useState(false)
  const refreshTimeoutRef = useRef<number | null>(null)
  const refreshingRef = useRef<Promise<AuthTokens | null> | null>(null)

  const applyTokens = useCallback((next: AuthTokens | null) => {
    setTokensState(next)
    if (next) {
      saveTokens(next)
    } else {
      clearStoredTokens()
    }
  }, [])

  const clearTokens = useCallback(() => {
    applyTokens(null)
    setIsReady(true)
  }, [applyTokens])

  const refreshAccessToken = useCallback(async (current: AuthTokens): Promise<AuthTokens | null> => {
    if (typeof window === 'undefined') {
      return null
    }

    if (!current.refreshToken) {
      applyTokens(null)
      throw new Error('No refresh token available')
    }

    const { clientId } = getSpotifyEnv()
    const params = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: current.refreshToken
    })

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = (payload as { error_description?: string })?.error_description ?? 'Failed to refresh Spotify token.'
      applyTokens(null)
      throw new Error(message)
    }

    const expiresAt = Date.now() + (payload.expires_in ?? 3600) * 1000
    const nextTokens: AuthTokens = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? current.refreshToken,
      expiresAt,
      scope: payload.scope ?? current.scope,
      tokenType: payload.token_type ?? current.tokenType
    }

    applyTokens(nextTokens)
    return nextTokens
  }, [applyTokens])

  const runRefresh = useCallback(
    async (source: AuthTokens) => {
      try {
        if (refreshingRef.current) {
          await refreshingRef.current
          return
        }

        refreshingRef.current = refreshAccessToken(source)
        await refreshingRef.current
      } catch (error) {
        console.error(error)
        applyTokens(null)
      } finally {
        refreshingRef.current = null
      }
    },
    [refreshAccessToken, applyTokens]
  )

  const scheduleRefresh = useCallback(
    (current: AuthTokens) => {
      if (typeof window === 'undefined') {
        return
      }

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }

      if (!current.refreshToken) {
        return
      }

      const msUntilExpiry = current.expiresAt - Date.now()
      if (msUntilExpiry <= REFRESH_BUFFER_MS) {
        void runRefresh(current)
        return
      }

      const delay = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, MIN_REFRESH_DELAY_MS)
      refreshTimeoutRef.current = window.setTimeout(() => {
        void runRefresh(current)
      }, delay)
    },
    [runRefresh]
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsReady(true)
      return
    }

    const stored = loadTokens()
    if (!stored) {
      setIsReady(true)
      return
    }

    if (stored.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
      applyTokens(stored)
      setIsReady(true)
      return
    }

    if (stored.refreshToken) {
      refreshAccessToken(stored)
        .catch(error => {
          console.error(error)
          applyTokens(null)
        })
        .finally(() => {
          setIsReady(true)
        })
      return
    }

    clearStoredTokens()
    setIsReady(true)
  }, [applyTokens, refreshAccessToken])

  useEffect(() => {
    if (!tokens) {
      if (refreshTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      return
    }

    scheduleRefresh(tokens)

    return () => {
      if (refreshTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [tokens, scheduleRefresh])

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const setTokens = useCallback(
    (next: AuthTokens | null) => {
      applyTokens(next)
      setIsReady(true)
    },
    [applyTokens]
  )

  const refreshTokens = useCallback(async () => {
    if (!tokens) {
      return
    }

    await runRefresh(tokens)
  }, [tokens, runRefresh])

  const value = useMemo(
    () => ({ tokens, setTokens, clearTokens, refreshTokens, isReady }),
    [tokens, setTokens, clearTokens, refreshTokens, isReady]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
