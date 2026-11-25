// Plays coach clips over Spotify without pausing or ducking it.
//
// Uses the Web Audio API with Safari's Audio Session API set to "ambient",
// which mixes with other apps' audio on iOS. Ambient audio follows the
// ring/silent switch, so the phone must not be on silent.
//
// iOS only allows sound after a user gesture: call unlockCoachAudio()
// synchronously inside the Start button's click handler, before any await.

import { ALL_COACH_CLIPS, type CoachClip } from './countdownPlan'

type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string }
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let context: AudioContext | null = null
const buffers = new Map<CoachClip, AudioBuffer>()
let loading: Promise<void> | null = null

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

/** Must run inside a tap/click handler. Safe to call more than once. */
export function unlockCoachAudio() {
  setAmbientSession()

  if (!context) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!Ctor) {
      throw new Error('This browser does not support Web Audio.')
    }
    context = new Ctor()
  }

  if (context.state !== 'running') {
    void context.resume().catch(() => undefined)
  }

  // Playing a silent buffer inside the gesture fully unlocks older iOS versions.
  const silent = context.createBuffer(1, 1, 22050)
  const source = context.createBufferSource()
  source.buffer = silent
  source.connect(context.destination)
  source.start(0)
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

  // iOS can suspend the context (e.g. after a phone call); try to wake it.
  if (context.state !== 'running') {
    void context.resume().catch(() => undefined)
  }

  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  source.start(0)
}
