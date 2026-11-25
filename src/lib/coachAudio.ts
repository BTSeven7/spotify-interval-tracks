// Plays coach clips over Spotify without pausing or ducking it.
//
// Uses the Web Audio API with Safari's Audio Session API set to "ambient",
// which mixes with other apps' audio on iOS. Ambient audio follows the
// ring/silent switch, so the phone must not be on silent.
//
// iOS only allows sound after a user gesture: call unlockCoachAudio()
// synchronously inside a tap handler, before any await.
//
// When another app takes over audio (opening Spotify, playing other music),
// iOS interrupts the page's AudioContext, and it doesn't always come back.
// So every unlock builds a fresh context, and callers can watch the state to
// ask for a tap when sound is blocked mid-session.

import { ALL_COACH_CLIPS, type CoachClip } from './countdownPlan'

type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string }
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let context: AudioContext | null = null
// Decoded buffers aren't tied to one context, so they survive a rebuild.
const buffers = new Map<CoachClip, AudioBuffer>()
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(listener => listener())
}

function setAmbientSession() {
  const nav = navigator as AudioSessionNavigator
  if (nav.audioSession) {
    try {
      nav.audioSession.type = 'ambient'
    } catch (error) {
      console.warn('Could not set audio session type', error)
    }
  }
}

/** True when clips can actually be heard right now. */
export function isCoachAudioRunning() {
  return context?.state === 'running'
}

/** Subscribe to audio state changes (running, suspended, interrupted...). */
export function subscribeCoachAudio(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Must run inside a tap/click handler. Throws away any previous context
 * (it may be stuck after an iOS interruption) and starts a fresh one.
 */
export function unlockCoachAudio() {
  setAmbientSession()

  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!Ctor) {
    throw new Error('This browser does not support Web Audio.')
  }

  if (context) {
    const old = context
    old.onstatechange = null
    void old.close().catch(() => undefined)
  }

  const fresh = new Ctor()
  fresh.onstatechange = notify
  context = fresh

  if (fresh.state !== 'running') {
    void fresh.resume().catch(() => undefined)
  }

  // Playing a silent buffer inside the gesture fully unlocks older iOS versions.
  const silent = fresh.createBuffer(1, 1, 22050)
  const source = fresh.createBufferSource()
  source.buffer = silent
  source.connect(fresh.destination)
  source.start(0)

  notify()
}

/** Try to wake the context without a tap (works after some interruptions). */
export function tryResumeCoachAudio() {
  if (context && context.state !== 'running' && context.state !== 'closed') {
    setAmbientSession()
    void context.resume().catch(() => undefined)
  }
}

async function loadClip(ctx: AudioContext, name: CoachClip) {
  const response = await fetch(`/audio/coach/${name}.mp3`)
  if (!response.ok) {
    throw new Error(`Could not load ${name}.mp3 (${response.status})`)
  }
  const data = await response.arrayBuffer()
  const buffer = await ctx.decodeAudioData(data)
  buffers.set(name, buffer)
}

/** Loads and decodes every clip once; later calls reuse the cache. */
export function loadCoachClips(): Promise<void> {
  if (!context) {
    return Promise.reject(new Error('Call unlockCoachAudio() first.'))
  }
  if (buffers.size === ALL_COACH_CLIPS.length) {
    return Promise.resolve()
  }
  if (!loading) {
    const ctx = context
    loading = Promise.all(ALL_COACH_CLIPS.filter(name => !buffers.has(name)).map(name => loadClip(ctx, name)))
      .then(() => undefined)
      .finally(() => {
        loading = null
      })
  }
  return loading
}

export function playCoachClip(name: CoachClip) {
  const buffer = buffers.get(name)
  if (!context || !buffer) {
    console.warn(`Coach clip not ready: ${name}`)
    return
  }

  tryResumeCoachAudio()

  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  source.start(0)
}
