const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export function generateCodeVerifier(length = 128): string {
  if (length < 43 || length > 128) {
    throw new Error('PKCE code verifier length must be between 43 and 128 characters.')
  }

  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  const result = Array.from(randomValues, value => PKCE_CHARSET[value % PKCE_CHARSET.length]).join('')
  return result
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
