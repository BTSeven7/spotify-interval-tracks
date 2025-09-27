import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AuthTokens } from '../context/AuthContext'
import type { IntervalStats } from './useIntervalPlan'

type SessionStatus = 'idle' | 'running' | 'completed'

type SessionState = {
  status: SessionStatus
  startedAt: number | null
  currentSliceIndex: number
}

export type IntervalSession = {
  state: SessionState
  elapsedMs: number
  currentSliceIndex: number
  totalSlices: number
  currentSlice?: IntervalStats['timeline'][number]
  nextSkipInMs: number | null
  canStart: boolean
  startSession: () => void
  stopSession: () => void
}

const CLEANUP_INTERVAL_MS = 500

export function useIntervalSession(tokens: AuthTokens | null, stats: IntervalStats): IntervalSession {
  const [state, setState] = useState<SessionState>({ status: 'idle', startedAt: null, currentSliceIndex: 0 })
  const [now, setNow] = useState(() => Date.now())
  const timersRef = useRef<number[]>([])
  const tickRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(id => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  const clearTicker = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const stopSession = useCallback(() => {
    clearTimers()
    clearTicker()
    setState({ status: 'idle', startedAt: null, currentSliceIndex: 0 })
  }, [clearTimers, clearTicker])

  const skipTrack = useCallback(async () => {
    if (!tokens?.accessToken) {
      return
    }

    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        }
      })
    } catch (error) {
      console.error('Failed to skip track', error)
    }
  }, [tokens?.accessToken])

  const startSession = useCallback(() => {
    if (!tokens?.accessToken || stats.timeline.length === 0) {
      return
    }

    clearTimers()
    clearTicker()

    const startTime = Date.now()
    setState({ status: 'running', startedAt: startTime, currentSliceIndex: 0 })
    setNow(startTime)

    tickRef.current = window.setInterval(() => {
      setNow(Date.now())
    }, CLEANUP_INTERVAL_MS)

    stats.timeline.forEach((slice, index) => {
      const trigger = window.setTimeout(() => {
        setState(prev => {
          if (prev.startedAt === null) {
            return prev
          }

          const nextIndex = Math.min(index + 1, stats.timeline.length - 1)
          const isLast = index === stats.timeline.length - 1
          const nextStatus: SessionStatus = isLast ? 'completed' : 'running'

          return {
            status: nextStatus,
            startedAt: prev.startedAt,
            currentSliceIndex: isLast ? index : nextIndex
          }
        })

        if (slice.skipAfter) {
          void skipTrack()
        }

        if (index === stats.timeline.length - 1) {
          clearTicker()
        }
      }, slice.endMs)

      timersRef.current.push(trigger)
    })
  }, [tokens?.accessToken, stats.timeline, clearTimers, clearTicker, skipTrack])

  useEffect(() => {
    if (!tokens?.accessToken && state.status === 'running') {
      stopSession()
    }
  }, [tokens?.accessToken, state.status, stopSession])

  useEffect(() => {
    stopSession()
  }, [stats.timeline.length, stats.totalDurationMs, stopSession])

  useEffect(() => () => {
    clearTimers()
    clearTicker()
  }, [clearTimers, clearTicker])

  const elapsedMs = state.startedAt ? Math.max(0, now - state.startedAt) : 0
  const currentSlice = stats.timeline[state.currentSliceIndex]
  const nextSkipInMs = useMemo(() => {
    if (state.startedAt === null || !currentSlice) {
      return null
    }

    if (!currentSlice.skipAfter) {
      return null
    }

    const target = state.startedAt + currentSlice.endMs
    return Math.max(0, target - now)
  }, [currentSlice, now, state.startedAt])

  return {
    state,
    elapsedMs,
    currentSliceIndex: state.currentSliceIndex,
    totalSlices: stats.timeline.length,
    currentSlice,
    nextSkipInMs,
    canStart: Boolean(tokens?.accessToken && stats.totalDurationMs > 0),
    startSession,
    stopSession
  }
}


