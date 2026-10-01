// A small stand-in for Webflow Interactions (IX2), built on the Web Animations API.
// The timelines in the components are transcribed from the original Webflow site's IX2 config:
// a timeline is a list of groups that run one after another, and every step in a
// group runs in parallel. Values are committed as inline styles, like IX2 does.

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

type Props = {
  translate?: string;
  scale?: string | number;
  rotate?: string;
  opacity?: number;
  width?: string;
  height?: string;
  display?: string;
  backgroundColor?: string;
};

export type Step = {
  /** CSS selector resolved inside the root element; omit to target the root itself. */
  el?: string;
  to: Props;
  d?: number;
  delay?: number;
  ease?: keyof typeof EASE;
};
export type Timeline = Step[][];

// outElastic(amplitude 1, period 0.3), sampled into a CSS linear() easing.
const elastic = `linear(${Array.from({ length: 41 }, (_, i) => {
  const t = i / 40;
  const v = t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin(((t - 0.075) * 2 * Math.PI) / 0.3) + 1;
  return v.toFixed(3);
}).join(', ')})`;

export const EASE = {
  linear: 'linear',
  ease: 'ease',
  inQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  outQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  inOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  inCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  outCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  outQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  outElastic: elastic,
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const targets = (root: HTMLElement, sel?: string) =>
  sel ? [...root.querySelectorAll<HTMLElement>(sel)] : [root];

/** Width/height "auto": measure the natural size so it can be animated to in px. */
function resolveAuto(el: HTMLElement, prop: 'width' | 'height') {
  const current = el.style[prop];
  el.style[prop] = '';
  const size = prop === 'width' ? el.offsetWidth : el.offsetHeight;
  el.style[prop] = current;
  return `${size}px`;
}

/** Persist an animation's current value as inline style, then drop the animation. */
function commit(anim: Animation, el: HTMLElement, fallback: Keyframe) {
  try {
    anim.commitStyles();
  } catch {
    // commitStyles() throws for elements that aren't rendered (display: none at this breakpoint)
    const { offset: _offset, easing: _easing, composite: _composite, computedOffset: _computed, ...props } = fallback;
    Object.assign(el.style, props);
  }
  anim.cancel();
}

/** Freeze in-flight animations on the given properties so a new one can take over from there. */
function settle(el: HTMLElement, props: string[]) {
  for (const a of el.getAnimations()) {
    if (a instanceof CSSAnimation || a instanceof CSSTransition) continue;
    const keyframes = (a.effect as KeyframeEffect).getKeyframes();
    if (!keyframes.some((k) => props.some((p) => p in k))) continue;
    commit(a, el, keyframes.at(-1) ?? {});
  }
}

async function runStep(root: HTMLElement, { el, to, d = 0, delay = 0, ease = 'linear' }: Step, instant: boolean) {
  const els = targets(root, el);
  if (instant) {
    d = 0;
    delay = 0;
  }
  const { display, ...animated } = to;
  if (display !== undefined) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    for (const e of els) e.style.display = display;
    if (!Object.keys(animated).length) return;
    delay = 0;
  }
  await Promise.all(
    els.map(async (e) => {
      settle(e, Object.keys(animated));
      const autoProps = (['width', 'height'] as const).filter((p) => animated[p] === 'auto');
      const frame: Keyframe = { ...animated };
      for (const p of autoProps) frame[p] = resolveAuto(e, p);
      const anim = e.animate([frame], { duration: d, delay, easing: EASE[ease], fill: 'forwards' });
      try {
        await anim.finished;
      } catch {
        return; // interrupted by a newer timeline on the same element
      }
      commit(anim, e, frame);
      for (const p of autoProps) e.style[p] = '';
    }),
  );
}

export async function play(root: HTMLElement, timeline: Timeline, instant = reducedMotion()) {
  for (const group of timeline) await Promise.all(group.map((s) => runStep(root, s, instant)));
}

/** Apply a timeline's end state synchronously (IX2's "use first group as initial state"). */
export function set(root: HTMLElement, group: Step[]) {
  for (const { el, to } of group)
    for (const e of targets(root, el)) {
      settle(e, Object.keys(to));
      Object.assign(e.style, to);
    }
}

type Options = {
  /** First group is the initial state, applied before paint. */
  init?: boolean;
  /** 'view' plays once when the root scrolls into view; 'load' plays on mount. */
  on?: 'view' | 'load';
  /** How far (in % of viewport height) the element must be inside the viewport. */
  offset?: number;
  delay?: number;
  loop?: boolean;
  /** Webflow breakpoint the interaction is limited to. */
  media?: string;
};

export function useIx<T extends HTMLElement>(timeline: Timeline, opts: Options = {}) {
  const ref = useRef<T>(null);
  const { init, on, offset = 0, delay = 0, loop, media } = opts;

  useLayoutEffect(() => {
    if (init && ref.current && (!media || matchMedia(media).matches)) set(ref.current, timeline[0]);
    // timelines are module constants
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = ref.current;
    if (!root || !on || (media && !matchMedia(media).matches)) return;
    let alive = true;
    const run = async () => {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      do {
        if (!alive) return;
        await play(root, init ? timeline.slice(1) : timeline);
      } while (loop && alive && !reducedMotion());
    };
    if (on === 'load') {
      run();
      return () => void (alive = false);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        run();
      },
      { rootMargin: `0px 0px -${offset}% 0px` },
    );
    io.observe(root);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const trigger = useCallback((tl: Timeline = timeline) => ref.current && play(ref.current, tl), [timeline]);
  return [ref, trigger] as const;
}
