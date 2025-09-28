import { useEffect, useRef, useState } from 'react'

import type { AuthTokens } from '../context/AuthContext'

export type CurrentTrack = {
  trackId: string
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

const DEFAULT_POLL_INTERVAL = 5000

export function useCurrentlyPlaying(tokens: AuthTokens | null, pollMs: number = DEFAULT_POLL_INTERVAL) {
  const [state, setState] = useState<HookState>(INITIAL_STATE)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    if (!tokens?.accessToken) {
      setState(INITIAL_STATE)
      return
    }

    let isActive = true

    const fetchCurrentTrack = async () => {
      setState(prev => (prev.initialized ? prev : { ...prev, isLoading: true }))

      try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        })

        if (response.status === 204) {
          if (isActive) {
            setState(prev => {
              if (!prev.initialized) {
                return { track: null, error: null, isLoading: false, initialized: true }
              }

              if (prev.track === null && prev.error === null && !prev.isLoading) {
                return prev
              }

              return { ...prev, track: null, error: null, isLoading: false, initialized: true }
            })
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
            setState(prev => {
              if (!prev.initialized) {
                return { track: null, error: null, isLoading: false, initialized: true }
              }

              if (prev.track === null && prev.error === null && !prev.isLoading) {
                return prev
              }

              return { ...prev, track: null, error: null, isLoading: false, initialized: true }
            })
          }
          return
        }

        const nextTrack: CurrentTrack = {
          trackId: item.id,
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
          setState(prev => {
            if (
              prev.track &&
              prev.track.trackId === nextTrack.trackId &&
              prev.track.isPlaying === nextTrack.isPlaying &&
              prev.track.albumArtUrl === nextTrack.albumArtUrl &&
              prev.track.artistNames === nextTrack.artistNames &&
              prev.track.albumName === nextTrack.albumName &&
              prev.track.durationMs === nextTrack.durationMs
            ) {
              return {
                ...prev,
                track: { ...nextTrack },
                isLoading: false,
                error: null,
                initialized: true
              }
            }

            return { track: nextTrack, error: null, isLoading: false, initialized: true }
          })
        }
      } catch (err) {
        if (isActive) {
          setState(prev => {
            const message = err instanceof Error ? err.message : 'Unknown error while fetching current track.'
            if (prev.error === message && prev.track === null && prev.initialized) {
              return prev
            }
            return {
              track: null,
              error: message,
              isLoading: false,
              initialized: true
            }
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
  }, [tokens?.accessToken, pollMs])

  return state
}

