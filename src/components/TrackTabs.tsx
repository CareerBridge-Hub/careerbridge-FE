import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useIx, type Timeline } from '../lib/ix';
import { MAIN_MEDIUM } from '../lib/site';

// IX2 "Track Management Animation": the two doodles rock back and forth, 4s per leg.
const rock: Timeline = [
  [
    { el: '.trackmanagementimage3', to: { rotate: '10deg' }, d: 4000 },
    { el: '.trackmanagementimage2', to: { rotate: '-10deg' }, d: 4000 },
  ],
  [
    { el: '.trackmanagementimage3', to: { rotate: '-10deg' }, d: 4000 },
    { el: '.trackmanagementimage2', to: { rotate: '10deg' }, d: 4000 },
  ],
];

const pop: Timeline = [[{ to: { scale: 0.75 }, d: 250, ease: 'outQuart' }], [{ to: { scale: 1 }, d: 1000, ease: 'outElastic' }]];

/**
 * Muted looping preview. Plays while on screen and pauses when scrolled away, unless the visitor
 * paused it themselves; reduced motion starts paused. Sound is opt-in through the toggle.
 */
function PreviewVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) video.pause();
        else if (!userPaused.current) video.play().catch(() => {});
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const togglePlay = () => {
    const video = ref.current!;
    userPaused.current = !video.paused;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleSound = () => {
    const video = ref.current!;
    video.muted = !video.muted;
    setMuted(video.muted);
    // Turning sound on is a clear "I want to watch this": start it if it was paused.
    if (!video.muted && video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    }
  };

  return (
    <div className="preview-frame">
      <video
        ref={ref}
        src="/assets/careerbridge/munder-difflin-053.mp4"
        poster="/assets/careerbridge/munder-difflin-053-poster.webp"
        aria-label="Video tampilan CareerBridge"
        className="preview-video"
        muted
        loop
        playsInline
        preload="none"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
      />
      <div className="preview-controls">
        <button type="button" className="preview-btn icon" onClick={togglePlay} aria-label={playing ? 'Jeda video' : 'Putar video'}>
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <button type="button" className="preview-btn" onClick={toggleSound} aria-pressed={!muted}>
          {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          <span className="preview-btn-label">{muted ? 'Nyalakan suara' : 'Matikan suara'}</span>
        </button>
      </div>
      <div className="preview-progress" aria-hidden="true">
        <div style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}

export function TrackTabs() {
  const [boxRef] = useIx<HTMLDivElement>(rock, { on: 'load', loop: true, media: MAIN_MEDIUM });
  const [iconRef] = useIx<HTMLImageElement>(pop, { on: 'view' });

  return (
    <div className="section tabsection">
      <div className="container mobile-padding-0">
        <h2 className="sectiontitle mobile-padding-15">Persiapan kerja jadi lebih terarah</h2>
        <p className="sectiontext mobile-padding-15">Intip dulu tampilannya supaya kebayang.</p>
        <div ref={boxRef} className="trackmanagementbox preview-box">
          <PreviewVideo />
          <img ref={iconRef} src="/assets/icon.svg" alt="" className="trackmanagementimage1" />
          <img src="/assets/vector-8.svg" alt="" className="trackmanagementimage2" />
          <img src="/assets/vector-6-1.svg" alt="" className="trackmanagementimage3 trackicon" />
        </div>
      </div>
    </div>
  );
}
