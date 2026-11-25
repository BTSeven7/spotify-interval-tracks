// Countdown Slicer: splits an interval into shrinking chunks and picks the
// coach clip for each chunk change.
//
// Rules:
// - Each chunk is half of the time left, rounded to the nearest 30s.
// - The interval always finishes with 30s chunks (two or three of them, so
//   never more than the last 90s).
// - No chunk is longer than CHUNK_CAP_SECONDS. When half the interval would be
//   longer than the cap, the first two chunks are thirds instead, so the
//   first skips still land on "one third" / "two thirds".

export const CHUNK_CAP_SECONDS = 15 * 60

export type CoachClip =
  | 'countdown-beep'
  | 'start'
  | 'one-third'
  | 'halfway'
  | 'two-thirds'
  | 'three-quarters'
  | 'almost-there'
  | 'left-4-30'
  | 'left-4-00'
  | 'left-3-30'
  | 'left-3-00'
  | 'left-2-30'
  | 'left-2-00'
  | 'left-1-30'
  | 'left-1-00'
  | 'left-0-30'
  | 'done'

export const ALL_COACH_CLIPS: CoachClip[] = [
  'countdown-beep',
  'start',
  'one-third',
  'halfway',
  'two-thirds',
  'three-quarters',
  'almost-there',
  'left-4-30',
  'left-4-00',
  'left-3-30',
  'left-3-00',
  'left-2-30',
  'left-2-00',
  'left-1-30',
  'left-1-00',
  'left-0-30',
  'done'
]

export const CLIP_LABELS: Record<CoachClip, string> = {
  'countdown-beep': 'Beep',
  start: 'Here we go',
  'one-third': 'One third done',
  halfway: 'Halfway',
  'two-thirds': 'Two thirds done',
  'three-quarters': 'Three quarters done',
  'almost-there': 'Almost there',
  'left-4-30': '4:30 to go',
  'left-4-00': '4:00 to go',
  'left-3-30': '3:30 to go',
  'left-3-00': '3:00 to go',
  'left-2-30': '2:30 to go',
  'left-2-00': '2:00 to go',
  'left-1-30': '1:30 to go',
  'left-1-00': '1:00 to go',
  'left-0-30': 'Last thirty',
  done: 'Done'
}

export type CountdownChunk = {
  index: number
  durationSec: number
  startSec: number
  endSec: number
  /** Clip that plays when this chunk ends (the last chunk ends with "done"). */
  endClip: CoachClip
}

function roundTo30(seconds: number) {
  return Math.max(30, Math.floor((seconds + 15) / 30) * 30)
}

function halve(totalSec: number): number[] {
  const chunks: number[] = []
  let remaining = totalSec
  while (remaining > 60) {
    let chunk = roundTo30(remaining / 2)
    // Always leave a full minute to finish as 0:30 + 0:30.
    if (remaining - chunk < 60) chunk = remaining - 60
    chunks.push(chunk)
    remaining -= chunk
  }
  if (remaining === 60) chunks.push(30, 30)
  else if (remaining > 0) chunks.push(remaining)
  return chunks
}

export function splitCountdown(totalSec: number, capSec = CHUNK_CAP_SECONDS): number[] {
  // Work on a 30s grid; anything else would break the 30s finish.
  const total = Math.max(0, Math.round(totalSec / 30) * 30)
  if (total === 0) return []

  const front: number[] = []
  let rest = total
  if (total / 2 > capSec) {
    if (total / 3 <= capSec) {
      const third = roundTo30(total / 3)
      front.push(third, third)
    } else {
      while (rest > 2 * capSec) {
        front.push(capSec)
        rest -= capSec
      }
    }
    rest = total - front.reduce((sum, c) => sum + c, 0)
  }

  return [...front, ...halve(rest)]
}

const FRACTION_CLIPS: Array<[number, CoachClip]> = [
  [1 / 3, 'one-third'],
  [1 / 2, 'halfway'],
  [2 / 3, 'two-thirds'],
  [3 / 4, 'three-quarters']
]
const FRACTION_TOLERANCE = 0.04

const TIME_LEFT_CLIPS: Record<number, CoachClip> = {
  270: 'left-4-30',
  240: 'left-4-00',
  210: 'left-3-30',
  180: 'left-3-00',
  150: 'left-2-30',
  120: 'left-2-00',
  90: 'left-1-30',
  60: 'left-1-00',
  30: 'left-0-30'
}

/** Clip for a chunk change `elapsedSec` into an interval of `totalSec`. */
export function clipForSwitch(totalSec: number, elapsedSec: number): CoachClip {
  const left = totalSec - elapsedSec
  const progress = elapsedSec / totalSec

  if (Math.abs(progress - 0.5) <= FRACTION_TOLERANCE) return 'halfway'
  if (TIME_LEFT_CLIPS[left]) return TIME_LEFT_CLIPS[left]

  let best = FRACTION_CLIPS[0]
  for (const candidate of FRACTION_CLIPS) {
    if (Math.abs(candidate[0] - progress) < Math.abs(best[0] - progress)) best = candidate
  }
  if (Math.abs(best[0] - progress) <= FRACTION_TOLERANCE) return best[1]

  // Only reachable for intervals over 45 minutes: a first-half switch that
  // doesn't land near a reference point gets a neutral beep, not a wrong line.
  return progress > 0.5 ? 'almost-there' : 'countdown-beep'
}

export function buildCountdownPlan(totalSec: number): CountdownChunk[] {
  const durations = splitCountdown(totalSec)
  const total = durations.reduce((sum, c) => sum + c, 0)
  let start = 0
  return durations.map((durationSec, index) => {
    const endSec = start + durationSec
    const chunk: CountdownChunk = {
      index,
      durationSec,
      startSec: start,
      endSec,
      endClip: index === durations.length - 1 ? 'done' : clipForSwitch(total, endSec)
    }
    start = endSec
    return chunk
  })
}
