import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser, useDb } from './api'
import { rankJobs, skillDemand } from './matching'

/** Everything the job-seeker pages derive from the store, computed once per change. */
export function useCareer() {
  const db = useDb()
  const user = useCurrentUser()!
  return useMemo(() => {
    const userSkillIds = user.skills.map((s) => s.skillId)
    const ranked = rankJobs(db.jobs, userSkillIds)
    const target = ranked.find((m) => m.job.id === user.targetJobId) ?? null
    return {
      db,
      user,
      userSkillIds,
      ranked,
      target,
      /** The job recommendations default to: the chosen target, else the best match. */
      focus: target ?? ranked[0] ?? null,
      skillsById: new Map(db.skills.map((s) => [s.id, s])),
      instById: new Map(db.institutions.map((i) => [i.id, i])),
      demand: skillDemand(db.jobs),
      postings: db.postings.filter((p) => !p.hidden).sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    }
  }, [db, user])
}

/**
 * Reveals `text` word by word, like a streamed AI answer. Instant under reduced motion.
 * Runs once per mount: give the caller a `key` of the text to replay for new text.
 */
export function useTypewriter(text: string, start: boolean, msPerWord = 28) {
  const words = useMemo(() => text.split(/(\s+)/), [text])
  const [instant] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!start || instant) return
    let i = 0
    const id = setInterval(() => {
      i++
      setN(i)
      if (i >= words.length) clearInterval(id)
    }, msPerWord)
    return () => clearInterval(id)
  }, [words, start, instant, msPerWord])
  const count = !start ? 0 : instant ? words.length : n
  return { shown: words.slice(0, count).join(''), done: count >= words.length }
}
