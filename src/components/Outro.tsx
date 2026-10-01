// Bottom of the page: the winking cat, the "Mudah bareng CareerBridge" marquee and the footer.
import { useIx, type Timeline } from '../lib/ix';
import { APP_URL } from '../lib/site';

// The cat winks: swap to the eyes-closed frame for 400ms (IX2 "downloadBox Animation Dog").
const wink: Timeline = [
  [{ el: '.downloadboximage1', to: { display: 'none' }, delay: 500 }, { el: '.downloadboximage2', to: { display: 'block' }, delay: 500 }],
  [{ el: '.downloadboximage2', to: { display: 'none' }, delay: 400 }, { el: '.downloadboximage1', to: { display: 'block' }, delay: 400 }],
];

// IX2 "downloadBox Animation": the speech bubble pops, the arrows draw in, then the cat winks.
const greet: Timeline = [
  [
    { el: '.downloadboxarrowright', to: { width: '0px' } },
    { el: '.downloadboxarrowleft', to: { width: '0px' } },
    { el: '.downloadbubble', to: { scale: 0 } },
    { el: '.downloadboximage2', to: { display: 'none' } },
  ],
  [{ el: '.downloadbubble', to: { scale: 1 }, d: 300, ease: 'inOutQuad' }],
  [{ el: '.downloadboxarrowleft', to: { width: 'auto' }, d: 300 }],
  [{ el: '.downloadboxarrowright', to: { width: 'auto' }, d: 300 }],
  ...wink,
];

export function Download() {
  const [ref, trigger] = useIx<HTMLDivElement>(greet, { init: true, on: 'view' });
  return (
    <div ref={ref} className="section downloadsection">
      <div className="container">
        <div className="downloadbox">
          <img src="/assets/group-1256.svg" alt="" className="downloadboxarrowleft" />
          {/* Easter egg: clicking the cat makes it wink again. */}
          <div className="downloadboximagewrap" onClick={() => trigger(wink)}>
            <img src="/assets/careerbridge/kucing-outro.webp" height="222" width="222" alt="" className="downloadboximage1" />
            <img src="/assets/careerbridge/kucing-outro-wink.webp" width="223" height="223" alt="" className="downloadboximage2" style={{ display: 'none' }} />
          </div>
          <div className="downloadbubble">
            <div>Yuk, coba sekarang, meong!</div>
            <img src="/assets/vector-1666-1.svg" alt="" className="downloadbubblearrow" />
            <div className="mobilebubblearrow" />
          </div>
          <img src="/assets/group-1257.svg" alt="" className="downloadboxarrowright" />
        </div>
      </div>
    </div>
  );
}

export function Marquee() {
  return (
    <div className="section padding-0">
      <div className="marquee-horizontal" aria-label="Mudah bareng CareerBridge" role="marquee">
        <div className="track-horizontal" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => [
            <div key={`a${i}`} className="marquee-text other">
              Mudah bareng <span className="marqueespan">CareerBridge</span>
            </div>,
            <div key={`b${i}`} className="marquee-text">
              Mudah bareng CareerBridge
            </div>,
          ])}
        </div>
      </div>
      <a href={APP_URL} className="button width-auto margin-top-30 w-inline-block">
        <div>Mulai sekarang</div>
      </a>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="section footersection">
      <div className="container">
        <div className="footer">
          <a
            id="w-node-_50556394-88fb-0d1b-3976-c6143b8c893c-62116877"
            href="#"
            className="footerlink contactusfooterlink"
          >
            Hubungi kami
          </a>
          <div className="footerstorewrap">
            <div className="footercopyright">© 2026 CareerBridge</div>
            <a href="#" className="footerstorelink w-inline-block">
              <img src="/assets/group-1324-1.svg" alt="CareerBridge di App Store" />
            </a>
            <a href="#" className="footerstorelink w-inline-block">
              <img src="/assets/group-1325-1.svg" alt="CareerBridge di Google Play" />
            </a>
          </div>
          <div className="footermenu">
            <a href="#" className="footerlink">
              Kebijakan Privasi
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
