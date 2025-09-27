import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getSpotifyEnv } from '../lib/env'
import { clearStoredAuthState, getStoredAuthState } from '../lib/spotifyAuth'

type Status = 'idle' | 'exchanging' | 'error'

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
  error_description?: string
}

export default function SpotifyCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setTokens } = useAuth()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const callbackError = useMemo(() => searchParams.get('error'), [searchParams])

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (callbackError) {
      setStatus('error')
      setError(callbackError === 'access_denied' ? 'You cancelled the Spotify sign-in.' : callbackError)
      clearStoredAuthState()
      return
    }

    if (!code) {
      setStatus('error')
      setError('Missing authorization code from Spotify.')
      return
    }

    const { verifier, state: storedState } = getStoredAuthState()

    if (!verifier) {
      setStatus('error')
      setError('No code verifier found. Please try signing in again.')
      return
    }

    if (!state || !storedState || state !== storedState) {
      setStatus('error')
      setError('State mismatch detected. We stopped the login attempt for security reasons.')
      clearStoredAuthState()
      return
    }

    const authCode = code as string
    const codeVerifier = verifier as string

    async function exchangeCode() {
      try {
        setStatus('exchanging')
        const { clientId, redirectUri } = getSpotifyEnv()
        const params = new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        })

        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        })

        const payload: TokenResponse = await response.json()

        if (!response.ok) {
          throw new Error(payload.error_description ?? 'Token exchange failed with Spotify.')
        }

        const expiresAt = Date.now() + payload.expires_in * 1000

        setTokens({
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          expiresAt,
          scope: payload.scope,
          tokenType: payload.token_type
        })

        clearStoredAuthState()
        navigate('/', { replace: true })
      } catch (err) {
        console.error(err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Unhandled error while exchanging Spotify tokens.')
        clearStoredAuthState()
      }
    }

    void exchangeCode()
  }, [callbackError, navigate, searchParams, setTokens])

  const heading = status === 'error' ? 'Spotify sign-in failed' : 'Finishing Spotify sign-in'
  const description =
    status === 'error'
      ? error ?? 'Something prevented Spotify from completing authentication.'
      : 'Hold tight while we secure access to your playback session.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-slate-50">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-lg shadow-emerald-500/10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10">
          {status === 'error' ? (
            <span className="text-emerald-200">!</span>
          ) : (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
          )}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">{heading}</h1>
          <p className="text-sm text-slate-300">{description}</p>
        </div>
        {status === 'error' ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              You can head back to the dashboard and try connecting again. Make sure the app stays open until Spotify redirects you here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              Return to app
            </Link>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            This window will close once we confirm the session. You can close the tab if it takes more than a few seconds.
          </p>
        )}
      </div>
    </div>
  )
}
