// Pure logic for the career map (Peta karir): rings, orbit layout, summary insights and step plan.
// Scores come from the backend match ranking; nothing here invents data.
import { POINTS, type JobMatch, type RankedTraining } from '@/app/lib/matching'

/** Node radius as a fraction of the orbit width (0.5 = edge): best match on the inner ring, weakest on the outer. */
export const R_IN = 0.22
export const R_OUT = 0.41

/**
 * Distance from the centre follows the match percentage only: the higher the score, the nearer.
 * Scaled to the scores on the map, so a profile whose matches all sit at 10–30% still spreads out.
 */
export function radiusOf(score: number, lo: number, hi: number): number {
  return hi === lo ? (R_IN + R_OUT) / 2 : R_IN + ((hi - score) / (hi - lo)) * (R_OUT - R_IN)
}

/** x, y are percent of the orbit box (0–100). */
export type OrbitNode = { match: JobMatch; angle: number; x: number; y: number }

/** Percent coordinates (0–100) of a point on the orbit; 0° points right, -90° up. */
export function orbitPoint(angle: number, radius: number) {
  const a = (angle * Math.PI) / 180
  return { x: 50 + Math.cos(a) * radius * 100, y: 50 + Math.sin(a) * radius * 100 }
}

/**
 * Rendered pill size in px, estimated from the text. Must track the node markup in CareerMap:
 * score chip + name (12px semibold, wraps to two lines at 8.5rem) + field line (10.5px).
 * Compact nodes show the score chip only.
 */
export function nodeBox(m: JobMatch, compact: boolean) {
  if (compact) return { w: 42, h: 24 }
  const perLine = 19 // characters of 12px semibold that fit in 8.5rem (136px)
  const lines = Math.min(2, Math.ceil(m.job.nama.length / perLine))
  const name = lines > 1 ? 136 : m.job.nama.length * 7
  const field = Math.min(136, m.job.bidang.length * 5.6)
  // border + left padding + score chip + gap + text + right padding; vertical padding + name lines + field line
  return { w: 4 + 4 + 34 + 6 + Math.max(name, field) + 12, h: 8 + lines * 15 + 14 }
}

const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180

/** Guide ring with its percentage caption; r is a fraction of the orbit width, x, y percent of the box. */
export type Caption = { score: number; r: number; x: number; y: number }

/** Caption chip size in px (11px medium "31%"). Must track the caption markup in the career map. */
export const captionBox = (score: number) => ({ w: `${score}%`.length * 6.3 + 22, h: 22 })

/** Score marks for the guide rings: highest, middle and lowest score on the map. */
export function ringScores(lo: number, hi: number): number[] {
  return hi === lo ? [hi] : [...new Set([hi, Math.round((hi + lo) / 2), lo])]
}

type Box = { w: number; h: number; x: number; y: number }
const overlap = (a: Box, b: Box, gap: number) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap

/**
 * Angle groups jobs of one field (bidang) side by side; radius = match percentage (radiusOf).
 * Percentage captions sit on their guide rings along the vertical axis (top or bottom, whichever
 * is emptier) and never move.
 * Pills that overlap a caption or each other are pushed along their own ring, so distance from
 * the centre keeps its meaning, and are kept inside the box. `size` is the orbit width in px.
 */
export function layoutOrbit(matches: JobMatch[], size = 520, compact = false): { nodes: OrbitNode[]; captions: Caption[] } {
  if (!matches.length) return { nodes: [], captions: [] }
  const order = [...new Map(matches.map((m) => [m.job.bidang, 0])).keys()].flatMap((b) => matches.filter((m) => m.job.bidang === b))
  const step = 360 / order.length
  // Half-step offset leaves straight up and/or straight down free for the captions.
  const angles = order.map((_, i) => -90 + step * (i + 0.5))
  const free = (a: number) => Math.min(...angles.map((x) => Math.abs(wrap(x - a))))
  const captionAngle = free(90) >= free(-90) ? 90 : -90
  const scores = order.map((m) => m.score)
  const lo = Math.min(...scores)
  const hi = Math.max(...scores)
  const captions = ringScores(lo, hi).map((score) => {
    const r = radiusOf(score, lo, hi)
    const p = orbitPoint(captionAngle, r)
    return { score, r, box: { ...captionBox(score), x: (p.x / 100) * size, y: (p.y / 100) * size } }
  })
  const radii = order.map((m) => radiusOf(m.score, lo, hi) * size)
  const sizes = order.map((m) => nodeBox(m, compact))
  const gap = 6
  const at = (i: number): Box => {
    const a = (angles[i] * Math.PI) / 180
    const { w, h } = sizes[i]
    // keep the whole pill inside the orbit box
    const x = Math.min(size - w / 2, Math.max(w / 2, size / 2 + Math.cos(a) * radii[i]))
    const y = Math.min(size - h / 2, Math.max(h / 2, size / 2 + Math.sin(a) * radii[i]))
    return { w, h, x, y }
  }
  // ponytail: O(n²) pairwise relaxation, fine for the ~10 nodes the orbit shows.
  for (let round = 0; round < 400; round++) {
    let moved = false
    for (let i = 0; i < order.length; i++) {
      for (const c of captions)
        if (overlap(at(i), c.box, gap)) {
          angles[i] += wrap(angles[i] - captionAngle) >= 0 ? 1 : -1
          moved = true
        }
      for (let j = i + 1; j < order.length; j++) {
        if (!overlap(at(i), at(j), gap)) continue
        const push = wrap(angles[j] - angles[i]) >= 0 ? 1 : -1
        angles[i] -= push
        angles[j] += push
        moved = true
      }
    }
    if (!moved) break
  }
  const nodes = order.map((match, i) => {
    const { x, y } = at(i)
    return { match, angle: wrap(angles[i]), x: (x / size) * 100, y: (y / size) * 100 }
  })
  return { nodes, captions: captions.map(({ score, r, box }) => ({ score, r, x: (box.x / size) * 100, y: (box.y / size) * 100 })) }
}

/** Highest score; ties go to the earlier (higher-ranked) job. */
export function bestMatch(matches: JobMatch[]): JobMatch | null {
  return matches.reduce<JobMatch | null>((best, m) => (!best || m.score > best.score ? m : best), null)
}

/** Default focus: the chosen target, else the highest match percentage (the job nearest the centre). */
export function defaultSelection(matches: JobMatch[], targetId: string | null): string | null {
  return matches.find((m) => m.job.id === targetId)?.job.id ?? bestMatch(matches)?.job.id ?? null
}

export type Insights = {
  /** Jobs whose required skills are all owned. */
  ready: number
  /** Owned skill used by the most destinations. */
  strongest: { skillId: string; jobs: number } | null
  /** Missing required skill shared by two or more destinations. */
  sharedGap: { skillId: string; jobNames: string[] } | null
}

export function insights(matches: JobMatch[]): Insights {
  let ready = 0
  const owned = new Map<string, number>()
  const gaps = new Map<string, string[]>()
  for (const m of matches) {
    if (!m.missingWajib.length) ready++
    for (const s of m.owned) owned.set(s.skillId, (owned.get(s.skillId) ?? 0) + 1)
    for (const s of m.missingWajib) gaps.set(s.skillId, [...(gaps.get(s.skillId) ?? []), m.job.nama])
  }
  // Map iteration keeps first-seen order, so ties go to the higher-ranked job's skill.
  let strongest: Insights['strongest'] = null
  for (const [skillId, jobs] of owned) if (!strongest || jobs > strongest.jobs) strongest = { skillId, jobs }
  let sharedGap: Insights['sharedGap'] = null
  for (const [skillId, jobNames] of gaps)
    if (jobNames.length >= 2 && (!sharedGap || jobNames.length > sharedGap.jobNames.length)) sharedGap = { skillId, jobNames }
  return { ready, strongest, sharedGap }
}

/** Score once every missing required skill is learned. */
export function projectedScore(m: JobMatch): number {
  return m.total ? Math.round(((m.earned + m.missingWajib.length * POINTS.wajib) / m.total) * 100) : 0
}

export type Step = { skillId: string; required: boolean; training: RankedTraining | null }

/**
 * Learning order: the AI priority list first (already validated by the server), then any missing
 * required skill it left out. Each step gets the best ranked training that covers that skill.
 */
export function planSteps(m: JobMatch, priority: string[], trainings: RankedTraining[]): Step[] {
  const required = new Set(m.missingWajib.map((s) => s.skillId))
  const missing = new Set([...required, ...m.missingOpsional.map((s) => s.skillId)])
  const order = [...new Set([...priority.filter((id) => missing.has(id)), ...required])]
  return order.map((skillId) => ({
    skillId,
    required: required.has(skillId),
    training: trainings.find((t) => t.coversWajib.includes(skillId) || t.coversOpsional.includes(skillId)) ?? null,
  }))
}

/** Total fee of the distinct suggested trainings; null when any fee is unknown. */
export function planCost(steps: Step[]): number | null {
  const seen = new Map(steps.flatMap((s) => (s.training ? [[s.training.training.id, s.training.training.biaya] as const] : [])))
  let total = 0
  for (const fee of seen.values()) {
    if (fee === null) return null
    total += fee
  }
  return total
}
