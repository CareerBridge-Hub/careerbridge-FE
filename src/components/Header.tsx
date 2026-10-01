import { useIx, type Timeline } from '../lib/ix';
import { APP_URL } from '../lib/site';

// IX2 "Header Animation": the "click me" doodle draws in, waves, then retracts.
const intro: Timeline = [
  [
    { el: '.image', to: { width: '0px' } },
    { el: '.headerarrowtext', to: { opacity: 0 } },
  ],
  [{ el: '.image', to: { width: '143px' }, d: 300 }],
  [{ el: '.headerarrowtext', to: { opacity: 1 }, d: 300, delay: 100, ease: 'outQuad' }],
  [{ el: '.headerarrowtext', to: { opacity: 0 }, d: 300, delay: 3000, ease: 'outQuad' }],
  [{ el: '.image', to: { width: '0px' }, d: 300 }],
];

// IX2 "pop", fired on the label 400ms and again 3000ms after it scrolls into view
// (the first pop ends at 1650ms, hence the 1350ms gap).
const pops: Timeline = [
  [{ to: { scale: 0.75 }, d: 250, ease: 'outQuart' }],
  [{ to: { scale: 1 }, d: 1000, ease: 'outElastic' }],
  [{ to: { scale: 0.75 }, d: 250, delay: 1350, ease: 'outQuart' }],
  [{ to: { scale: 1 }, d: 1000, ease: 'outElastic' }],
];

export function Header() {
  const [ref] = useIx<HTMLDivElement>(intro, { init: true, on: 'view' });
  const [popRef] = useIx<HTMLDivElement>(pops, { on: 'view', delay: 400 });

  return (
    <div ref={ref} className="section headersection">
      <div className="container vertical-align-stretch">
        <header className="header">
          <a href="/" className="logo w-inline-block" aria-label="Beranda CareerBridge">
            <img src="/assets/group-1116.svg" alt="" className="logoimage" />
            <img src="/assets/careerbridge/logo-text.svg" alt="CareerBridge" className="logotext" />
          </a>
          <div className="headercontent">
            <a href={`${APP_URL}masuk`} className="whitebutton w-inline-block">
              <div>Masuk / Daftar</div>
            </a>
          </div>
          <div className="headerarrow" aria-hidden="true">
            <div className="headerarrowtextwrap">
              <div ref={popRef} className="headerarrowtext">
                klik aku
              </div>
            </div>
            <img src="/assets/group-4335464.svg" alt="" className="image" />
          </div>
        </header>
      </div>
    </div>
  );
}
