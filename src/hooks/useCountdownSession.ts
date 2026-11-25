import { useCallback, useEffect, useRef, useState } from 'react'

import type { AuthTokens } from '../context/AuthContext'
import { loadCoachClips, playCoachClip, unlockCoachAudio } from '../lib/coachAudio'
import type { CoachClip, CountdownChunk } from '../lib/countdownPlan'

export type CueStyle = 'voice' | 'skip'
export type CountdownPhase = 'idle' | 'loading' | 'countdown' | 'running' | 'completed'

export const LEAD_IN_MS = 10_000
const TICK_MS = 250

type Timeline = {
  plan: CountdownChunk[]
  cueStyle: CueStyle
  goAt: number
  /** Number of chunk ends already handled. */
  handled: number
}

export type CountdownSession = {
  phase: CountdownPhase
  error: string | null
  /** Seconds left in the 10s lead-in (countdown phase only). */
  leadInSecondsLeft: number | null
  /** Index of the chunk being ridden (running phase only). */
  currentChunkIndex: number | null
  chunkMsLeft: number | null
  totalMsLeft: number | null
  start: () => void
  stop: () => void
}

export function useCountdownSession(
  tokens: AuthTokens | null,
  plan: CountdownChunk[],
  cueStyle: CueStyle
): CountdownSession {
  const [phase, setPhase] = useState<CountdownPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const timelineRef = useRef<Timeline | null>(null)
  const tickRef = useRef<number | null>(null)
  const runIdRef = useRef(0)

  // Always skip with the latest token, even if it was renewed mid-session.
  const tokenRef = useRef(tokens?.accessToken)
  useEffect(() => {
    tokenRef.current = tokens?.accessToken
  }, [tokens?.accessToken])

  const stopTicker = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const skipTrack = useCallback(async () => {
    const token = tokenRef.current
    if (!token) {
      setError('Spotify is disconnected. Reconnect to keep skipping tracks.')
      return
    }
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const detail = payload?.error?.message ?? `HTTP ${response.status}`
        setError(`Spotify didn't skip the track: ${detail}`)
      }
    } catch (err) {
      console.error('Failed to skip track', err)
      setError('Could not reach Spotify to skip the track.')
    }
  }, [])

  const cue = useCallback(
    (style: CueStyle, clip: CoachClip) => {
      if (style === 'voice') {
        playCoachClip(clip)
      } else {
        void skipTrack()
      }
    },
    [skipTrack]
  )

  const tick = useCallback(() => {
    const timeline = timelineRef.current
    if (!timeline) return

    const current = Date.now()
    setNow(current)
    if (current < timeline.goAt) return

    const elapsedSec = (current - timeline.goAt) / 1000
    const { plan: chunks } = timeline

    if (timeline.handled === -1) {
      // The "go" moment: voice says start; skip mode starts a fresh song.
      timeline.handled = 0
      setPhase('running')
      cue(timeline.cueStyle, 'start')
    }

    // Find every chunk end that has passed. If the phone was asleep and
    // several passed at once, only cue the most recent one.
    let latest = timeline.handled
    while (latest < chunks.length && chunks[latest].endSec <= elapsedSec) {
      latest += 1
    }
    if (latest === timeline.handled) return

    timeline.handled = latest
    const endedChunk = chunks[latest - 1]
    cue(timeline.cueStyle, endedChunk.endClip)

    if (latest === chunks.length) {
      timelineRef.current = null
      stopTicker()
      setPhase('completed')
    }
  }, [cue, stopTicker])

  const stop = useCallback(() => {
    runIdRef.current += 1
    timelineRef.current = null
    stopTicker()
    setPhase('idle')
  }, [stopTicker])

  const start = useCallback(() => {
    if (plan.length === 0) return
    if (!tokenRef.current) {
      setError('Connect Spotify before starting.')
      return
    }

    setError(null)
    try {
      // Must happen synchronously inside the tap, before any await.
      unlockCoachAudio()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio is not available in this browser.')
      return
    }

    const runId = ++runIdRef.current
    const style = cueStyle
    const chunks = plan
    setPhase('loading')

    loadCoachClips()
      .catch(err => {
        console.error(err)
        if (style === 'voice') {
          setError('Some voice clips failed to load, so some cues may be silent.')
        }
      })
      .finally(() => {
        if (runIdRef.current !== runId) return // stopped while loading
        const goAt = Date.now() + LEAD_IN_MS
        timelineRef.current = { plan: chunks, cueStyle: style, goAt, handled: -1 }
        playCoachClip('countdown-beep')
        setNow(Date.now())
        setPhase('countdown')
        stopTicker()
        tickRef.current = window.setInterval(tick, TICK_MS)
      })
  }, [plan, cueStyle, tick, stopTicker])

  // Catch up right away when the page becomes visible again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [tick])

  // Changing the plan or cue style mid-session would desync it, so stop.
  useEffect(() => {
    stop()
  }, [plan, cueStyle, stop])

  useEffect(() => () => stopTicker(), [stopTicker])

  const timeline = timelineRef.current
  let leadInSecondsLeft: number | null = null
  let currentChunkIndex: number | null = null
  let chunkMsLeft: number | null = null
  let totalMsLeft: number | null = null

  if (timeline && phase === 'countdown') {
    leadInSecondsLeft = Math.max(1, Math.ceil((timeline.goAt - now) / 1000))
  }

  if (timeline && phase === 'running') {
    const elapsedMs = Math.max(0, now - timeline.goAt)
    const index = Math.min(Math.max(timeline.handled, 0), timeline.plan.length - 1)
    const chunk = timeline.plan[index]
    const totalSec = timeline.plan[timeline.plan.length - 1].endSec
    currentChunkIndex = index
    chunkMsLeft = Math.max(0, chunk.endSec * 1000 - elapsedMs)
    totalMsLeft = Math.max(0, totalSec * 1000 - elapsedMs)
  }

  return { phase, error, leadInSecondsLeft, currentChunkIndex, chunkMsLeft, totalMsLeft, start, stop }
}
