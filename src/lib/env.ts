const missingEnvError = (key: string) =>
  new Error(`Missing environment variable: ${key}. Did you copy .env.example to .env.local?`)

export function getSpotifyEnv() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI

  if (!clientId) {
    throw missingEnvError('VITE_SPOTIFY_CLIENT_ID')
  }

  if (!redirectUri) {
    throw missingEnvError('VITE_SPOTIFY_REDIRECT_URI')
  }

  return {
    clientId,
    redirectUri
  } as const
}
