// The four feature blocks between the card section and the reviews: notes, to-do's,
// tasks and tables. Each assembles an illustration from layered SVGs that pop in when
// the block scrolls into view (IX2 "… Section Animation").
import { useIx, type Step, type Timeline } from '../lib/ix';
import { APP_URL, MAIN_MEDIUM } from '../lib/site';

const popIn = (el: string): Step[] => [{ el, to: { scale: 1 }, d: 200, ease: 'outQuad' }];
const hidden = (...els: string[]): Step[] => els.map((el) => ({ el, to: { scale: 0 } }));

// IX2 "Card Icon Animation": two badges per illustration drift diagonally, 4s per leg.
const float = (a: string, b: string): Timeline => [
  [
    { el: a, to: { translate: '5px 5px' }, d: 4000 },
    { el: b, to: { translate: '-5px -5px' }, d: 4000 },
  ],
  [
    { el: a, to: { translate: '-5px -5px' }, d: 4000 },
    { el: b, to: { translate: '5px 5px' }, d: 4000 },
  ],
];
const floatOpts = { on: 'load', loop: true, media: MAIN_MEDIUM } as const;

const noteIn: Timeline = [
  [{ el: '.noteimage2', to: { opacity: 0 } }, ...hidden('.noteimage3', '.noteimage4', '.noteimage5'), { el: '.notetitlelineimage', to: { width: '0%' } }],
  [{ el: '.notetitlelineimage', to: { width: '100%' }, d: 300 }],
  [{ el: '.noteimage2', to: { opacity: 1 }, d: 200 }],
  popIn('.noteimage3'),
  popIn('.noteimage4'),
  popIn('.noteimage5'),
];

export function Note() {
  const [ref] = useIx<HTMLDivElement>(noteIn, { init: true, on: 'view', offset: 20 });
  const [floatRef] = useIx<HTMLDivElement>(float('.noteimage4', '.noteimage5'), floatOpts);
  return (
    <div className="section notesection">
      <div className="container vertical-align-left mobile-padding-0">
        <div ref={ref} className="note">
          <div className="notecontent">
            <div className="notetitle">
              <h2 className="notetitle">Tahu mulai dari mana</h2>
              <img src="/assets/line-6-3.svg" alt="" className="notetitlelineimage" />
            </div>
            <div className="notetextwrap">
              <p className="notetext">
                AI menjelaskan dalam Bahasa Indonesia skill mana yang sebaiknya dipelajari duluan, dan alasannya.
              </p>
              <div className="notesubtextwrap">
                <img src="/assets/group-1504-1.svg" alt="" className="notesubtextimage" />
                <div className="notesubtext">Susun prioritas, lalu jalan!</div>
                <img src="/assets/group-1503-1.svg" alt="" className="notesubtextimage2" />
              </div>
            </div>
            <a href={APP_URL} className="notebutton w-inline-block">
              <div>Coba</div>
            </a>
          </div>
          <div ref={floatRef} className="noteimage">
            <img src="/assets/rectangle-14.svg" alt="" className="noteimage1" />
            <img src="/assets/careerbridge/note-urutan-belajar.webp" width="449" alt="Urutan belajar dari AI: K3 Dasar lalu Operasi Forklift" className="noteimage2" />
            <img src="/assets/group-4335414.svg" alt="" className="noteimage3" />
            <img src="/assets/careerbridge/note-pill-prioritas.webp" width="173" alt="" className="noteimage4" />
            <img src="/assets/careerbridge/note-pill-ai.webp" width="241" alt="" className="noteimage5" />
          </div>
          <div className="noteimagemobile">
            <img src="/assets/careerbridge/note-mobile.webp" width="350" alt="Urutan belajar dari AI: K3 Dasar lalu Operasi Forklift" />
          </div>
        </div>
      </div>
    </div>
  );
}

const listIn: Timeline = [
  [...hidden('.listimage2', '.listimage3', '.listimage4'), { el: '.listimage6', to: { translate: '0px 105px' } }, { el: '.listtitledecorative', to: { width: '0%' } }],
  [{ el: '.listimage6', to: { translate: '0px 0px' }, d: 200, ease: 'outQuad' }],
  popIn('.listimage3'),
  popIn('.listimage4'),
  popIn('.listimage2'),
  [{ el: '.listtitledecorative', to: { width: 'auto' }, d: 300, ease: 'outCubic' }],
];

export function List() {
  const [ref] = useIx<HTMLDivElement>(listIn, { init: true, on: 'view' });
  const [floatRef] = useIx<HTMLDivElement>(float('.listimage2', '.listimage3'), floatOpts);
  return (
    <div className="section listsection">
      <div className="container">
        <div ref={ref} className="list">
          <div ref={floatRef} className="listimage">
            <img src="/assets/careerbridge/kucing-list.webp" width="182" alt="" className="listimage6" />
            <img src="/assets/careerbridge/paws-list.webp" width="229" alt="" className="listimage5" />
            <img src="/assets/group-4335415-1.svg" alt="" className="listimage4" />
            <img src="/assets/careerbridge/pill-skill-kurang.svg" alt="" className="listimage3" />
            <img src="/assets/group-4335422.svg" alt="" className="listimage2" />
            <img src="/assets/group-4334981.svg" alt="Ilustrasi daftar tugas" className="listimage1" />
          </div>
          <div className="listimagemobile">
            <img src="/assets/careerbridge/list-mobile.webp" width="347" alt="Ilustrasi daftar tugas" className="image-3" />
          </div>
          <div className="listcontent">
            <div className="listtitlewrap">
              <img src="/assets/rectangle-2721.svg" alt="" className="listtitledecorative" />
              <h2 className="listtitle">Lihat yang kurang</h2>
            </div>
            <p className="listcontenttext">
              Skill dibagi tiga: yang sudah kamu punya, skill wajib yang belum, dan skill tambahan.
              <br />
              <br />
              <strong className="listcontenttextspan">Mau langsung jelas?</strong>
            </p>
            <div className="listtext">
              <div className="listcircle" />
              <div>Cek skill yang kurang</div>
            </div>
            <div className="listtext">
              <div className="listcircle" />
              <div>Pelajari satu per satu sampai skill-mu lengkap!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const taskIn: Timeline = [
  [...hidden('.taskimage6', '.taskimage8', '.taskimage4', '.taskimage3', '.taskimage5'), { el: '.taskimage9', to: { width: '0px' } }],
  popIn('.taskimage6'),
  popIn('.taskimage5'),
  popIn('.taskimage3'),
  popIn('.taskimage4'),
  [{ el: '.taskimage9', to: { width: 'auto' }, d: 500, ease: 'outCubic' }],
  popIn('.taskimage8'),
];

export function Task() {
  const [ref] = useIx<HTMLDivElement>(taskIn, { init: true, on: 'view', offset: 20 });
  const [floatRef] = useIx<HTMLDivElement>(float('.taskimage4', '.taskimage6'), floatOpts);
  return (
    <div className="section tasksection">
      <div className="container vertical-align-left mobile-padding-0">
        <div ref={ref} className="task">
          <div className="taskcontent">
            <div className="taskbadge">
              <div className="taskbadgecircle" />
              <div>Terbaru</div>
            </div>
            <div className="tasktitlewrap">
              <h2 className="tasktitle">Lowongan asli</h2>
            </div>
            <p className="tasktext">
              Tiap pekerjaan dilengkapi lowongan terbaru di Indonesia, dengan link ke sumber aslinya.
              <br />
              <br />
              <strong className="tasktextspan">Melamarnya langsung di situs sumber, bukan di sini.</strong>
            </p>
            <a href={APP_URL} className="notebutton w-inline-block">
              <div>Coba</div>
            </a>
          </div>
          <div ref={floatRef} className="taskimage">
            <img src="/assets/hand.svg" alt="" className="taskimage10" />
            <img src="/assets/vector-3822.svg" alt="" className="taskimage9" />
            <img src="/assets/careerbridge/task-bubble.webp" width="109" alt="" className="taskimage8" />
            <img src="/assets/careerbridge/kucing-gelantung.webp" width="276" alt="" className="taskimage7" />
            <img src="/assets/careerbridge/pill-lowongan.svg" alt="" className="taskimage6" />
            <img src="/assets/group-4335414-1.svg" alt="" className="taskimage5" />
            <img src="/assets/careerbridge/task-pill-terbaru.webp" width="154" alt="" className="taskimage4" />
            <img src="/assets/careerbridge/task-lihat-sumber.webp" width="208" alt="" className="taskimage3" />
            <img src="/assets/group-4334985.svg" alt="Ilustrasi lowongan terbaru" className="taskimage2" />
            <img src="/assets/rectangle-14-3.svg" alt="" className="taskimage1" />
          </div>
          <div className="taskimagemobile">
            <img src="/assets/careerbridge/task-mobile.webp" width="347" alt="Ilustrasi lowongan terbaru" />
          </div>
        </div>
      </div>
    </div>
  );
}

const sheetIn: Timeline = [
  [...hidden('.sheetimage3', '.sheetimage4'), { el: '.sheetimage6', to: { translate: '0px 105px' } }],
  [{ el: '.sheetimage6', to: { translate: '0px 0px' }, d: 200, ease: 'outQuad' }],
  popIn('.sheetimage4'),
  popIn('.sheetimage3'),
];

export function Sheet() {
  const [ref] = useIx<HTMLDivElement>(sheetIn, { init: true, on: 'view' });
  return (
    <div className="section sheetsection">
      <div className="container">
        <div ref={ref} className="sheet">
          <div className="sheetimage">
            <img src="/assets/careerbridge/kucing-sheet.webp" width="191" alt="" className="sheetimage6" />
            <img src="/assets/careerbridge/paws-sheet.webp" width="230" alt="" className="sheetimage5" />
            <img src="/assets/group-4335435-1.svg" alt="" className="sheetimage4" />
            <img src="/assets/careerbridge/pill-pelatihan.svg" alt="" className="sheetimage3" />
            <img src="/assets/careerbridge/sheet-rekomendasi.webp" width="516" alt="Rekomendasi pelatihan: K3 Dasar, Operasi Forklift, Microsoft Excel Lanjutan" className="sheetimage2" />
            <img src="/assets/careerbridge/sheet-filter.webp" width="644" alt="Panel saring pelatihan: gratis, tatap muka, Jawa Barat" className="sheetimage1" />
          </div>
          <div className="sheetimagemobile">
            <img src="/assets/careerbridge/sheet-mobile.webp" width="347" alt="Rekomendasi pelatihan dan panel saring" />
          </div>
          <div className="sheetcontent">
            <img src="/assets/careerbridge/badge-pelatihan.svg" alt="" className="sheeticon" />
            <h2 className="sheettitle">Cari Pelatihan &amp; LPK</h2>
            <div className="sheettextwrap">
              <h3 className="sheetsubtitle">Rekomendasi</h3>
              <p className="sheettext">Pelatihan yang menutup paling banyak skill wajib yang masih kurang akan ditaruh paling atas.</p>
            </div>
            <div className="sheettextwrap">
              <h3 className="sheetsubtitle">Saring sesukamu</h3>
              <p className="sheettext">
                Saring gratis atau berbayar, online atau tatap muka, dan provinsi. Daftarnya lewat link penyelenggara.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
