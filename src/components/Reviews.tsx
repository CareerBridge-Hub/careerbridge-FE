import { useEffect, useRef, useState } from 'react';
import { useIx, type Timeline } from '../lib/ix';

// The reviews are screenshots of reposts on X; the alt text carries what each one says.
const REVIEWS = [
  { src: 'group-4335542-1.png', alt: 'Tangkapan layar ulasan di X' },
  {
    src: 'group-4335541-1.png',
    alt: 'Tangkapan layar ulasan di X',
  },
  { src: 'group-4335540-1.png', alt: 'Tangkapan layar ulasan di X' },
  {
    src: 'group-4335539-1.png',
    alt: 'Tangkapan layar ulasan di X',
  },
  { src: 'group-4335544-1.png', alt: 'Tangkapan layar ulasan di X' },
  {
    src: 'group-4335537-1.png',
    alt: 'Tangkapan layar ulasan di X',
  },
];

// Webflow slider settings: data-animation="fade" data-duration="500" data-delay="5000" data-autoplay.
const FADE = 500;
const DELAY = 5000;

const slideInLeft: Timeline = [
  [{ to: { opacity: 0, translate: '-100px 0px' } }],
  [{ to: { opacity: 1, translate: '0px 0px' }, d: 1000, ease: 'outQuart' }],
];

export function Reviews() {
  const [titleRef] = useIx<HTMLHeadingElement>(slideInLeft, { init: true, on: 'view' });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % REVIEWS.length), DELAY);
    return () => clearTimeout(timer);
  }, [index, paused]);

  const swipe = (endX: number) => {
    if (touchX.current === null) return;
    const dx = endX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    setIndex((i) => (i + (dx < 0 ? 1 : -1) + REVIEWS.length) % REVIEWS.length);
  };

  return (
    <div className="section">
      <div className="container">
        <div className="reviews">
          <h2 ref={titleRef} className="reviewstitle">
            Kata mereka
            <br />
            <span className="reviewstitlespan">dari pengguna uji coba</span>
          </h2>
          <div className="reviewscontent">
            <div className="reviewscontentleft">
              <img src="/assets/vector.svg" alt="" className="reviewscontentleftimage1" />
              <img src="/assets/careerbridge/kucing-reviews.webp" width="142" alt="" className="reviewscontentleftimage2" />
            </div>
            <div className="reviewsboxwrapper">
              <div
                className="reviewsboxslider w-slider"
                role="region"
                aria-roledescription="carousel"
                aria-label="Ulasan pengguna"
                onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
                onTouchEnd={(e) => swipe(e.changedTouches[0].clientX)}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                <div className="w-slider-mask">
                  {REVIEWS.map((r, i) => (
                    <div
                      key={r.src}
                      className="w-slide"
                      aria-hidden={i !== index}
                      style={{
                        transform: `translateX(${-i * 100}%)`,
                        opacity: i === index ? 1 : 0,
                        visibility: i === index ? 'visible' : 'hidden',
                        transition: `opacity ${FADE}ms ease, visibility 0s linear ${i === index ? 0 : FADE}ms`,
                      }}
                    >
                      <div className="reviewsbox">
                        <div className="reviewsboxcover" />
                        <img src={`/assets/${r.src}`} alt={r.alt} className="reviewsboximg" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-slider-aria-label sr-only" aria-live="polite">
                  Slide {index + 1} dari {REVIEWS.length}.
                </div>
              </div>
              <img src="/assets/group4335543.svg" alt="" className="reviewsboxdecorative" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
