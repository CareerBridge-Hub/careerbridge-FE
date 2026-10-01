import { useEffect, useState } from 'react';
import { play, useIx, type Step, type Timeline } from '../lib/ix';
import { MAIN, MEDIUM } from '../lib/site';

const TABS = [
  { icon: 'careerbridge/icon-upload-cv.svg', title: 'Upload CV', text: 'Upload CV PDF, AI mengambil daftar skill-mu. Hasil yang salah bisa kamu betulkan.' },
  { icon: 'outline.svg', title: 'Lihat skor kecocokan', text: 'Lihat seberapa cocok skill-mu dengan tiap pekerjaan dan skill wajib mana yang masih kurang.' },
  { icon: 'document-report-1.svg', title: 'Pelatihan', text: 'Dapatkan pelatihan dari LPK, BLK, atau kursus online yang mengajarkan skill yang kurang.' },
];
const DEFAULT_TAB = 1;

const REST = { translate: '0px 0px', rotate: '0deg' };
// Desktop hover (IX2 "Card Tab 1/2/3"): the hovered feature's card fans out of the stack.
const FAN: Record<string, Step['to']>[] = [
  {
    '.card.card1': { translate: '-129px 40px', rotate: '-4deg', opacity: 1 },
    '.card.card2': { ...REST, scale: 1 },
    '.card.card3': { ...REST, opacity: 0.7 },
    '.cardicon1': { translate: '-129px 40px' },
    '.cardicon2': { scale: 1 },
    '.cardicon3': { translate: '0px 0px' },
  },
  {
    '.card.card1': { ...REST, opacity: 0.7 },
    '.card.card2': { ...REST, scale: 1.05 },
    '.card.card3': { ...REST, opacity: 0.7 },
    '.cardicon1': { translate: '0px 0px' },
    '.cardicon2': { scale: 1.05 },
    '.cardicon3': { translate: '0px 0px' },
  },
  {
    '.card.card1': { ...REST, opacity: 0.7 },
    '.card.card2': { ...REST, scale: 1 },
    '.card.card3': { translate: '130px 40px', rotate: '6deg', opacity: 1 },
    '.cardicon1': { translate: '0px 0px' },
    '.cardicon2': { scale: 1 },
    '.cardicon3': { translate: '130px 40px' },
  },
];
const fan = (i: number): Timeline => [Object.entries(FAN[i]).map(([el, to]) => ({ el, to, d: 200, ease: 'inQuad' }))];

// Tablet tap (IX2 "Card Tab … Mobile"): only the tapped feature's card is shown, except the
// middle one which shows the whole stack.
const m = (n: number) => `.card.card${n}.mobile`;
const MOBILE: Timeline[] = [
  [
    [{ el: m(2), to: { opacity: 0 }, d: 200 }, { el: m(3), to: { opacity: 0 }, d: 200 }],
    [{ el: m(1), to: { display: 'block' } }, { el: m(2), to: { display: 'none' } }, { el: m(3), to: { display: 'none' } }, { el: m(1), to: { translate: '0px 0px', opacity: 1 }, d: 200 }],
  ],
  [
    [{ el: m(2), to: { display: 'block' } }],
    [{ el: m(2), to: { opacity: 1 }, d: 200 }],
    [{ el: m(1), to: { display: 'block', opacity: 0.7 } }, { el: m(3), to: { display: 'block', opacity: 0.7 } }],
  ],
  [
    [{ el: m(2), to: { opacity: 0 }, d: 200 }, { el: m(1), to: { opacity: 0 }, d: 200 }],
    [{ el: m(3), to: { display: 'block' } }, { el: m(1), to: { display: 'none' } }, { el: m(2), to: { display: 'none' } }, { el: m(3), to: { translate: '0px 0px', opacity: 1 }, d: 200 }],
  ],
];
// IX2 "Card Hover Out", when the section leaves the viewport. Its selectors also match the
// tablet/mobile copies of the cards, which is why they end up scaled/dimmed too.
const reset: Timeline = [...fan(DEFAULT_TAB), [1, 2, 3].map((n) => ({ el: m(n), to: { display: 'block' } }))];

// IX2 "card Animation": the doodled arrows draw themselves once the section is 40% in view.
const arrowsIn: Timeline = [
  [
    { el: '.cardarrow1', to: { height: '0px' } },
    { el: '.cardarrow2', to: { height: '0px' } },
    { el: '.cardarrow3', to: { height: '0px' } },
    { el: '.cardplayarrow', to: { width: '0px' } },
  ],
  [
    { el: '.card.card3', to: { opacity: 0.7 }, d: 200 },
    { el: '.card.card1', to: { opacity: 0.7 }, d: 200 },
  ],
  [{ el: '.cardplayarrow', to: { width: 'auto' }, d: 500 }],
  [{ el: '.cardarrow2', to: { height: 'auto' }, d: 300, delay: 500 }],
  [{ el: '.cardarrow1', to: { height: 'auto' }, d: 400 }],
  [{ el: '.cardarrow3', to: { height: 'auto' }, d: 500 }],
];

const slideIn = (x: number, y: number): Timeline => [
  [{ to: { opacity: 0, translate: `${x}px ${y}px` } }],
  [{ to: { opacity: 1, translate: '0px 0px' }, d: 1000, ease: 'outQuart' }],
];
const SLIDE_LEFT = slideIn(-100, 0);
const SLIDE_UP = slideIn(0, 100);
const TAB_DELAYS = [200, 0, 400];

function CardTab({ i, active, onPick }: { i: number; active: boolean; onPick: (i: number, via: 'hover' | 'tap') => void }) {
  const [ref] = useIx<HTMLDivElement>(SLIDE_UP, { init: true, on: 'view', delay: TAB_DELAYS[i] });
  const { icon, title, text } = TABS[i];
  return (
    <div
      ref={ref}
      className={`cardtab${i === DEFAULT_TAB ? ' active' : ''}`}
      style={{ backgroundColor: active ? '#e5e5e5' : 'rgba(0, 0, 0, 0)' }}
      onMouseEnter={() => onPick(i, 'hover')}
      onClick={() => onPick(i, 'tap')}
    >
      <div className="cardtabicon">
        <img src={`/assets/${icon}`} alt="" />
      </div>
      <div className="cardtabcontent">
        <div className="cardtabtitle">{title}</div>
        <p className="cardtabtext">{text}</p>
      </div>
    </div>
  );
}

export function Cards() {
  const [active, setActive] = useState(DEFAULT_TAB);
  const [ref] = useIx<HTMLDivElement>(arrowsIn, { init: true, on: 'view', offset: 40 });
  const [subtitleRef] = useIx<HTMLDivElement>(SLIDE_LEFT, { init: true, on: 'view' });

  const pick = (i: number, via: 'hover' | 'tap') => {
    const root = ref.current;
    if (!root) return;
    if (via === 'hover' && matchMedia(MAIN).matches) play(root, fan(i));
    else if (via === 'tap' && matchMedia(MEDIUM).matches) play(root, MOBILE[i]);
    else return;
    setActive(i);
  };

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let seen = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) seen = true;
      else if (seen) {
        play(root, reset);
        setActive(DEFAULT_TAB);
      }
    });
    io.observe(root);
    return () => io.disconnect();
  }, [ref]);

  return (
    <div ref={ref} className="section cardsection">
      <div className="container cardcontainer">
        <h2 className="sectiontitle width-530">Jadi, apa gunanya CareerBridge?</h2>
        <p className="sectiontext">Tidak perlu menebak lagi skill apa yang diminta pekerjaan incaranmu.</p>
        <div className="cardplaywrap">
          <div className="cardsubtitlewrap">
            <div ref={subtitleRef} className="cardsubtitle">
              Petakan
              <br />
              kariermu
            </div>
          </div>
          <div className="cardplaybutton" />
          <img src="/assets/vector-3821-1.svg" alt="" className="cardplayarrowmobile" />
          <img src="/assets/vector-3821.svg" alt="" className="cardplayarrow desktopcardplayarrow" />
        </div>
        <div className="cardwrap">
          <img src="/assets/careerbridge/card-upload-cv.webp" alt="Formulir upload CV dengan skill yang terdeteksi" width="570.5" className="card card1" />
          <img src="/assets/careerbridge/card-skor-kecocokan.webp" alt="Skor kecocokan 78% untuk Operator Produksi" width="510.5" className="card card2" />
          <img src="/assets/careerbridge/card-pelatihan.webp" alt="Daftar pelatihan yang disarankan" width="561" className="card card3" />
          <div className="cardicon1" />
          <div className="cardicon2" />
          <img src="/assets/group-4335415.svg" alt="" className="cardicon3" />
          <div className="cardmobilewrap">
            <img src="/assets/careerbridge/card-skor-kecocokan.webp" alt="Skor kecocokan 78% untuk Operator Produksi" className="card card2 mobile" />
            <img src="/assets/careerbridge/card-upload-cv-mobile.webp" alt="Formulir upload CV dengan skill yang terdeteksi" className="card card1 mobile" />
            <img src="/assets/careerbridge/card-pelatihan-mobile.webp" alt="Daftar pelatihan yang disarankan" className="card card3 mobile" />
          </div>
        </div>
        <div className="cardtabwrap">
          {TABS.map((_, i) => (
            <CardTab key={i} i={i} active={i === active} onPick={pick} />
          ))}
        </div>
        <img src="/assets/group-1257-1.svg" alt="" className="cardarrow1" />
        <img src="/assets/curved-1.svg" alt="" className="cardarrow2" />
        <img src="/assets/group-4335014-1.svg" alt="" className="cardarrow3" />
      </div>
    </div>
  );
}
