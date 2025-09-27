import { getSpotifyEnv } from './env'
import { generateCodeChallenge, generateCodeVerifier } from './pkce'

export const SPOTIFY_PKCE_VERIFIER_KEY = 'spotify:pkce_verifier'
export const SPOTIFY_AUTH_STATE_KEY = 'spotify:auth_state'

export const SPOTIFY_SCOPES = [
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing'
]

export async function beginSpotifyAuth(scopes: string[] = SPOTIFY_SCOPES) {
  if (typeof window === 'undefined') {
    throw new Error('Spotify auth can only start in the browser context.')
  }

  const { crypto } = window

  if (!crypto || !crypto.subtle) {
    throw new Error('This browser does not support the required Web Crypto APIs for PKCE.')
  }

  const { clientId, redirectUri } = getSpotifyEnv()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = crypto.randomUUID ? crypto.randomUUID() : generateFallbackState()

  sessionStorage.setItem(SPOTIFY_PKCE_VERIFIER_KEY, codeVerifier)
  sessionStorage.setItem(SPOTIFY_AUTH_STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
    scope: scopes.join(' ')
  })

  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`)
}

export function getStoredAuthState() {
  const verifier = sessionStorage.getItem(SPOTIFY_PKCE_VERIFIER_KEY)
  const state = sessionStorage.getItem(SPOTIFY_AUTH_STATE_KEY)
  return { verifier, state }
}

export function clearStoredAuthState() {
  sessionStorage.removeItem(SPOTIFY_PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(SPOTIFY_AUTH_STATE_KEY)
}

function generateFallbackState() {
  return Math.random().toString(36).slice(2, 12)
}
