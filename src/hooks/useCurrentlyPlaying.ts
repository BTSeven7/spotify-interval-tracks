import { useEffect, useRef, useState } from 'react'

import type { AuthTokens } from '../context/AuthContext'

export type CurrentTrack = {
  trackName: string
  artistNames: string
  albumName: string
  albumArtUrl?: string
  isPlaying: boolean
  progressMs: number
  durationMs: number
  updatedAt: number
}

type HookState = {
  track: CurrentTrack | null
  error: string | null
  isLoading: boolean
  initialized: boolean
}

const INITIAL_STATE: HookState = {
  track: null,
  error: null,
  isLoading: false,
  initialized: false
}

// Spotify Web API requires polling for playback updates when not using the Web Playback SDK.
const DEFAULT_POLL_INTERVAL = 5000

export function useCurrentlyPlaying(tokens: AuthTokens | null, pollMs: number = DEFAULT_POLL_INTERVAL) {
  const [{ track, error, isLoading }, setState] = useState<HookState>(INITIAL_STATE)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    if (!tokens?.accessToken) {
      setState(INITIAL_STATE)
      return
    }

    let isActive = true

    const fetchCurrentTrack = async () => {
      setState(prev => (prev.track === null && prev.error === null && !prev.isLoading ? { ...prev, isLoading: true } : prev))

      try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        })

        if (response.status === 204) {
          if (isActive) {
            setState({ track: null, error: null, isLoading: false, initialized: true })
          }
          return
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error?.message ?? 'Failed to load current Spotify track.')
        }

        const payload = await response.json()
        const item = payload?.item

        if (!item) {
          if (isActive) {
            setState({ track: null, error: null, isLoading: false, initialized: true })
          }
          return
        }

        const nextTrack: CurrentTrack = {
          trackName: item.name,
          artistNames: Array.isArray(item.artists) ? item.artists.map((artist: any) => artist.name).join(', ') : 'Unknown artist',
          albumName: item.album?.name ?? 'Unknown album',
          albumArtUrl: item.album?.images?.[0]?.url,
          isPlaying: Boolean(payload.is_playing),
          progressMs: payload.progress_ms ?? 0,
          durationMs: item.duration_ms ?? 0,
          updatedAt: Date.now()
        }

        if (isActive) {
          setState({ track: nextTrack, error: null, isLoading: false, initialized: true })
        }
      } catch (err) {
        if (isActive) {
          setState({
            track: null,
            error: err instanceof Error ? err.message : 'Unknown error while fetching current track.',
            isLoading: false,
            initialized: true
          })
        }
      }
    }

    fetchCurrentTrack()

    pollRef.current = window.setInterval(fetchCurrentTrack, pollMs)

    return () => {
      isActive = false
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [tokens?.accessToken, pollMs, tokens?.expiresAt])

  return { track, error, isLoading }
}



