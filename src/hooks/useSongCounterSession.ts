import { useCallback, useEffect, useRef, useState } from 'react'

import type { AuthTokens } from '../context/AuthContext'
import type { CurrentTrack } from './useCurrentlyPlaying'

type SongCounterStatus = 'idle' | 'running'

type CompletedSong = {
  trackId: string
  trackName: string
  artistNames: string
  durationMs: number
}

type ActiveTrackSnapshot = {
  trackId: string
  trackName: string
  artistNames: string
  durationMs: number
  startProgressMs: number
  latestProgressMs: number
}

type SongCounterState = {
  status: SongCounterStatus
  songsCompleted: number
  totalElapsedMs: number
  lastSong: CompletedSong | null
  error: string | null
}

export type SongCounterSession = {
  status: SongCounterStatus
  songsCompleted: number
  totalElapsedMs: number
  lastSong: CompletedSong | null
  currentElapsedMs: number | null
  remainingMs: number | null
  afterSongMs: number | null
  canStart: boolean
  isWaitingForPlayback: boolean
  isBusy: boolean
  error: string | null
  clearError: () => void
  start: () => void
  stop: () => void
  skip: () => Promise<void>
}

const INITIAL_STATE: SongCounterState = {
  status: 'idle',
  songsCompleted: 0,
  totalElapsedMs: 0,
  lastSong: null,
  error: null
}

function getLiveProgress(track: CurrentTrack) {
  const now = Date.now()
  const drift = track.isPlaying ? Math.max(0, now - track.updatedAt) : 0
  const estimated = track.progressMs + drift
  return Math.min(track.durationMs, Math.max(0, estimated))
}

export function useSongCounterSession(tokens: AuthTokens | null, track: CurrentTrack | null): SongCounterSession {
  const [state, setState] = useState<SongCounterState>(INITIAL_STATE)
  const activeTrackRef = useRef<ActiveTrackSnapshot | null>(null)
  const lastFinalizedTrackIdRef = useRef<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const canStart = Boolean(tokens?.accessToken && track && track.isPlaying && state.status === 'idle')
  const isWaitingForPlayback = state.status === 'running' && (!track || !track.isPlaying)

  const clearError = useCallback(() => {
    setState(prev => (prev.error ? { ...prev, error: null } : prev))
  }, [])

  const finalizeActiveTrack = useCallback(
    (overrideProgressMs?: number) => {
      const snapshot = activeTrackRef.current
      if (!snapshot) {
        return
      }

      const latest = typeof overrideProgressMs === 'number' ? overrideProgressMs : snapshot.latestProgressMs
      const cappedLatest = Math.min(snapshot.durationMs, Math.max(snapshot.startProgressMs, latest))
      const playedMs = Math.max(0, cappedLatest - snapshot.startProgressMs)

      activeTrackRef.current = null
      lastFinalizedTrackIdRef.current = snapshot.trackId

      if (playedMs <= 0) {
        return
      }

      setState(prev => ({
        ...prev,
        songsCompleted: prev.songsCompleted + 1,
        totalElapsedMs: prev.totalElapsedMs + playedMs,
        lastSong: {
          trackId: snapshot.trackId,
          trackName: snapshot.trackName,
          artistNames: snapshot.artistNames,
          durationMs: playedMs
        }
      }))
    },
    []
  )

  const beginTracking = useCallback((currentTrack: CurrentTrack) => {
    const liveProgress = getLiveProgress(currentTrack)
    activeTrackRef.current = {
      trackId: currentTrack.trackId,
      trackName: currentTrack.trackName,
      artistNames: currentTrack.artistNames,
      durationMs: currentTrack.durationMs,
      startProgressMs: liveProgress,
      latestProgressMs: liveProgress
    }
    lastFinalizedTrackIdRef.current = null
  }, [])

  const start = useCallback(() => {
    if (!track || !track.isPlaying) {
      setState(prev => ({ ...prev, error: 'Start playback in Spotify before counting songs.' }))
      return
    }

    if (!tokens?.accessToken) {
      setState(prev => ({ ...prev, error: 'Spotify access expired. Reconnect and try again.' }))
      return
    }

    setState({ status: 'running', songsCompleted: 0, totalElapsedMs: 0, lastSong: null, error: null })
    beginTracking(track)
  }, [track, tokens?.accessToken, beginTracking])

  const stop = useCallback(() => {
    if (state.status === 'idle') {
      return
    }

    finalizeActiveTrack()
    activeTrackRef.current = null
    lastFinalizedTrackIdRef.current = null
    setIsBusy(false)
    setState(prev => ({ ...prev, status: 'idle' }))
  }, [state.status, finalizeActiveTrack])

  const skip = useCallback(async () => {
    if (state.status !== 'running') {
      return
    }

    const current = track
    if (current) {
      finalizeActiveTrack(getLiveProgress(current))
    } else {
      finalizeActiveTrack()
    }

    if (!tokens?.accessToken) {
      return
    }

    setIsBusy(true)
    clearError()

    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        }
      })
    } catch (error) {
      console.error('Failed to skip track', error)
      setState(prev => ({
        ...prev,
        error: 'Could not skip track. Check your Spotify app and try again.'
      }))
    } finally {
      setIsBusy(false)
    }
  }, [state.status, track, tokens?.accessToken, finalizeActiveTrack, clearError])

  useEffect(() => {
    if (state.status !== 'running') {
      return
    }

    if (!track) {
      finalizeActiveTrack()
      activeTrackRef.current = null
      lastFinalizedTrackIdRef.current = null
      return
    }

    if (lastFinalizedTrackIdRef.current === track.trackId && !activeTrackRef.current) {
      return
    }

    if (!activeTrackRef.current) {
      beginTracking(track)
      return
    }

    const active = activeTrackRef.current
    if (active && active.trackId === track.trackId) {
      active.latestProgressMs = getLiveProgress(track)
      active.durationMs = track.durationMs
      active.trackName = track.trackName
      active.artistNames = track.artistNames
      return
    }

    finalizeActiveTrack()
    beginTracking(track)
  }, [track?.trackId, track?.progressMs, track?.updatedAt, state.status, finalizeActiveTrack, beginTracking])

  useEffect(() => {
    if (!tokens?.accessToken && state.status === 'running') {
      stop()
    }
  }, [tokens?.accessToken, state.status, stop])

  useEffect(() => {
    return () => {
      finalizeActiveTrack()
    }
  }, [finalizeActiveTrack])

  const snapshot = activeTrackRef.current
  const currentElapsedMs = snapshot && state.status === 'running'
    ? Math.max(0, snapshot.latestProgressMs - snapshot.startProgressMs)
    : null

  const remainingMs = snapshot && state.status === 'running'
    ? Math.max(0, snapshot.durationMs - snapshot.latestProgressMs)
    : null

  const afterSongMs = snapshot && state.status === 'running'
    ? state.totalElapsedMs + Math.max(0, snapshot.durationMs - snapshot.startProgressMs)
    : null

  return {
    status: state.status,
    songsCompleted: state.songsCompleted,
    totalElapsedMs: state.totalElapsedMs,
    lastSong: state.lastSong,
    currentElapsedMs,
    remainingMs,
    afterSongMs,
    canStart,
    isWaitingForPlayback,
    isBusy,
    error: state.error,
    clearError,
    start,
    stop,
    skip
  }
}
