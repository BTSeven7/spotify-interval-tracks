import { useState } from 'react'

type Mode = 'interval-slicer' | 'song-counter'

type ModeMeta = {
  title: string
  description: string
  checklist: string[]
}

const modes: Record<Mode, ModeMeta> = {
  'interval-slicer': {
    title: 'Interval Slicer',
    description:
      'Define sub-intervals within a long effort and automatically skip to the next track when each slice finishes.',
    checklist: [
      'Enter interval length and slice durations',
      'Preview the upcoming track markers',
      'Tap start to sync skips'
    ]
  },
  'song-counter': {
    title: 'Song Counter',
    description:
      'Stay in the groove of your playlist and get a clear count of songs completed with total elapsed time markers.',
    checklist: [
      'Auto-advance through the playlist',
      'Surface elapsed time each song',
      'Celebrate every finished track'
    ]
  }
}

function App() {
  const [activeMode, setActiveMode] = useState<Mode>('interval-slicer')
  const [isConnected] = useState(false)

  const active = modes[activeMode]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:py-16">
        <nav className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-[0_0_80px_rgba(16,185,129,0.05)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">Ride markers</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Workout Spotify Companion</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Skip counting laps; let songs anchor your intervals. This workspace will orchestrate Spotify playback around the effort you dial in.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="group relative inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-200 opacity-60"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400/80 group-disabled:animate-pulse" aria-hidden />
            Spotify Connect (coming soon)
          </button>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <article className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
              <header className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Step 1</span>
                <h2 className="text-2xl font-semibold text-white">Choose a workout flow</h2>
                <p className="text-sm text-slate-400">
                  Each mode frames the same playlist differently. Pick one to configure the cues we will display between songs.
                </p>
              </header>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(modes).map(([mode, meta]) => {
                  const selected = activeMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => setActiveMode(mode as Mode)}
                      className={`rounded-2xl border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                        selected
                          ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.25)]'
                          : 'border-slate-800 bg-slate-950/60 hover:border-emerald-400/50 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                        <span className={selected ? 'text-emerald-300' : 'text-slate-500'}>Mode</span>
                        <span className={selected ? 'text-emerald-300' : 'text-slate-500'}>
                          {selected ? 'Selected' : 'Tap to select'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-semibold text-white">{meta.title}</h3>
                      <p className="mt-2 text-sm text-slate-300">{meta.description}</p>
                    </button>
                  )
                })}
              </div>
            </article>

            <article className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
              <header className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Step 2</span>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Dial in your interval plan</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    We will use this data to time track skips and surface encouragement cues instead of a running timer.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200">
                  Builder queued
                </span>
              </header>
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center">
                <p className="text-sm text-slate-400">
                  A guided form for interval duration, slice breakdown, and optional motivational notes will live here. We will render previews of upcoming markers with Tailwind UI cards.
                </p>
              </div>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-7">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Spotify connection</h2>
                  <p className="text-sm text-slate-400">Authenticate once, then just press play in your Spotify app.</p>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-500 animate-pulse'}`}
                  aria-hidden
                />
              </header>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400/80" aria-hidden />
                  <span>OAuth with PKCE for a secure, login-free experience</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400/80" aria-hidden />
                  <span>Playback control scoped to skipping and progress monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400/80" aria-hidden />
                  <span>No playlist edits or data storage beyond your session</span>
                </li>
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-7">
              <h2 className="text-xl font-semibold text-white">{active.title} checklist</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {active.checklist.map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10">
                      <svg
                        className="h-3 w-3 text-emerald-200"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M3 8.5L6.5 12L13 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-7">
              <h2 className="text-xl font-semibold text-white">Session summary (up next)</h2>
              <p className="mt-2 text-sm text-slate-400">
                Once we capture playback events, this card will report songs completed, total effort time, and the next cue coming your way.
              </p>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-5 text-sm text-slate-500">
                No live data yet -- connect Spotify to populate this space.
              </div>
            </article>
          </aside>
        </section>
      </div>
    </div>
  )
}

export default App
