import { useEffect, useState } from 'react';
import { useIx, type Timeline } from '../lib/ix';
import { APP_URL, MAIN_MEDIUM } from '../lib/site';

const BANNER = ['start', 'arrow', '', 'arrow', 'continue'];
const BANNER_SRC = ['group-4335440', 'group-4335443', 'group-4335441-1', 'group-4335444', 'group-4335442'];

// IX2 "bannerAnimation": start → stop → continue pop in one after another.
const bannerIn: Timeline = [
  BANNER.map((_, i) => ({ el: `img:nth-child(${i + 1})`, to: { scale: 0 } })),
  ...BANNER.map((_, i) => [{ el: `img:nth-child(${i + 1})`, to: { scale: 1 }, d: 200, ease: 'outQuart' as const }]),
];

// IX2 "Hero Button Click": the cat's paws dip when "Get started" is pressed.
const pawsDip: Timeline = [
  [{ to: { translate: '0px 3px' }, d: 100 }],
  [{ to: { scale: 0.97 }, d: 100, ease: 'inQuad' }],
  [{ to: { scale: 1 }, d: 100, delay: 200, ease: 'inQuad' }],
  [{ to: { translate: '0px 0px' }, d: 100 }],
];

// IX2 "Hero Animation": the two doodles drift around in a 2s-per-leg loop.
const drift: Timeline = [
  ['8px 2px', '-8px -2px'],
  ['8px 8px', '-8px 8px'],
  ['-8px 8px', '8px 8px'],
  ['-8px -8px', '8px 0px'],
].map(([right, left]) => [
  { el: '.heroctacontainerimage.right', to: { translate: right }, d: 2000 },
  { el: '.heroctacontainerimage.left', to: { translate: left }, d: 2000 },
]);

const TYPED = ['kamu incar.', 'cocok buatmu.', 'kamu impikan.'];

/** typed.js with the original settings: typeSpeed 75, backSpeed 50, backDelay 2000, loop. */
function useTyped(strings: string[]) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [text, setText] = useState(reduced ? strings[0] : '');
  useEffect(() => {
    if (reduced) return;
    let i = 0;
    let len = 0;
    let deleting = false;
    let timer: number;
    // typed.js "humanizes" each keystroke by up to +50% of the base speed
    const human = (speed: number) => Math.round((Math.random() * speed) / 2) + speed;
    const tick = () => {
      const word = strings[i];
      if (!deleting) {
        setText(word.slice(0, ++len));
        if (len === word.length) {
          deleting = true;
          timer = window.setTimeout(tick, 2000);
          return;
        }
        timer = window.setTimeout(tick, human(75));
      } else {
        setText(word.slice(0, --len));
        if (len === 0) {
          deleting = false;
          i = (i + 1) % strings.length;
        }
        timer = window.setTimeout(tick, human(50));
      }
    };
    timer = window.setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [strings, reduced]);
  return text;
}

export function Hero() {
  const [bannerRef] = useIx<HTMLDivElement>(bannerIn, { init: true, on: 'view' });
  const [pawsRef, dipPaws] = useIx<HTMLImageElement>(pawsDip);
  const [ctaRef] = useIx<HTMLDivElement>(drift, { on: 'load', loop: true, media: MAIN_MEDIUM });
  const typed = useTyped(TYPED);

  return (
    <>
      <div ref={bannerRef} className="banner" role="img" aria-label="start, stop, continue">
        {BANNER.map((cls, i) => (
          <img key={i} src={`/assets/${BANNER_SRC[i]}.svg`} alt="" className={`bannerimage ${cls}`.trim()} />
        ))}
      </div>

      <div className="section herosection">
        <div className="container">
          <div className="herocontenttitlewrap">
            <h1 className="title">Cara baru untuk</h1>
            <img src="/assets/careerbridge/kucing-hero.webp" width="155" alt="" className="contenttitleimage" />
            <h1 className="title">memetakan</h1>
          </div>
          <div className="herocontenttitlewrap mobile">
            <h1 className="title mobilehero">
              Cara baru memetakan karier yang <span className="title degrade">kamu incar.</span>
            </h1>
            <p className="herotext mobile">Upload CV, lihat skill yang masih kurang, lalu temukan pelatihan untuk menutupnya.</p>
          </div>
          <img src="/assets/careerbridge/kucing-hero-mobile.webp" width="139" alt="" className="contenttitleimage mobile" />
          <div className="herocontent">
            <a href={`${APP_URL}daftar`} className="button mobile-font-size-20 w-inline-block" onClick={() => dipPaws()}>
              <div>Daftar gratis</div>
            </a>
            <div className="herocontentright">
              <a href={`${APP_URL}masuk`} className="whitebutton w-inline-block" style={{ flex: 1, minHeight: 44 }}>
                <div>Masuk</div>
              </a>
            </div>
            <img ref={pawsRef} src="/assets/careerbridge/paws-hero.webp" width="205" id="w-node-_5ad04db5-e9a0-f7ca-1008-010feda6093f-29ee7531" alt="" className="doghands" />
            <img src="/assets/group-1.svg" id="w-node-_6a66dd60-7c93-43b1-10d5-05ee758a21da-29ee7531" alt="" className="herocursor" />
          </div>
          <div className="herocontenttitlewrap">
            <div className="row">
              <h1 className="title">karier yang</h1>
              <h1 className="title degrade typed-words">{typed}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="section padding-0">
        <div ref={ctaRef} className="container heroctacontainer">
          <p className="herotext">Upload CV, lihat skill yang masih kurang, lalu temukan pelatihan untuk menutupnya.</p>
          <div className="herocta">
            <img src="/assets/fire.svg" alt="" />
            <div>Belum punya CV? Pilih skill-mu dari daftar.</div>
          </div>
          <img src="/assets/group-3.svg" width="65" alt="" className="heroctacontainerimage right" />
          <img src="/assets/group-1155.svg" width="56" alt="" className="heroctacontainerimage left" />
          <img src="/assets/line-6-5.svg" alt="" className="heroctaline" />
        </div>
      </div>
    </>
  );
}
