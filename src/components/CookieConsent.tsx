// Stand-in for Finsweet Cookie Consent (opt-in mode) with the original markup and IX2 motion:
// the banner slides up from 100px, the preferences modal fades up from 20px, and once a
// choice is stored the cookie "manager" button sits bottom-left to reopen preferences.
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { play, type Timeline } from '../lib/ix';

const STORAGE_KEY = 'fs-cc';
const OPTIONAL = [
  {
    id: 'marketing',
    label: 'Pemasaran',
    text: 'Data ini dipakai untuk menampilkan iklan yang lebih sesuai dengan minatmu. Data ini juga bisa dipakai untuk membatasi berapa kali kamu melihat iklan yang sama dan mengukur hasil iklan. Jaringan iklan biasanya memasangnya dengan izin pemilik situs.',
  },
  {
    id: 'personalization',
    label: 'Personalisasi',
    text: 'Data ini membuat situs mengingat pilihanmu (misalnya nama pengguna, bahasa, atau daerahmu) supaya tampilannya lebih sesuai untukmu. Misalnya, situs bisa menampilkan info daerahmu dengan menyimpan data lokasimu.',
  },
  {
    id: 'analytics',
    label: 'Analitik',
    text: 'Data ini membantu pemilik situs memahami kinerja situs, cara pengunjung memakainya, dan apakah ada masalah teknis. Jenis data ini biasanya tidak mengumpulkan informasi yang bisa mengenali pengunjung.',
  },
] as const;
type Choices = Record<(typeof OPTIONAL)[number]['id'], boolean>;
const NONE: Choices = { marketing: false, personalization: false, analytics: false };
const ALL: Choices = { marketing: true, personalization: true, analytics: true };

function readStored(): Choices | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...NONE, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

// The banner only slides; the manager and the preferences modal also fade.
const show = (display: string, y: string, fade = true): Timeline => [
  [{ to: { display, translate: `0px ${y}`, ...(fade && { opacity: 0 }) } }],
  [{ to: { translate: '0px 0px', ...(fade && { opacity: 1 }) }, d: 300, ease: 'ease' }],
];
const hide = (y: string, fade = true): Timeline => [
  [{ to: { translate: `0px ${y}`, ...(fade && { opacity: 0 }) }, d: 300, ease: 'ease' }],
  [{ to: { display: 'none' } }],
];

const CloseIcon = ({ viewBox }: { viewBox: string }) => (
  <svg fill="currentColor" aria-hidden="true" focusable="false" viewBox={viewBox}>
    <path d="M9.414 8l4.293-4.293-1.414-1.414L8 6.586 3.707 2.293 2.293 3.707 6.586 8l-4.293 4.293 1.414 1.414L8 9.414l4.293 4.293 1.414-1.414L9.414 8z" />
  </svg>
);

export function CookieConsent() {
  const [stored, setStored] = useState<Choices | null>(readStored);
  const [draft, setDraft] = useState<Choices>(stored ?? NONE);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const banner = useRef<HTMLDivElement>(null);
  const prefs = useRef<HTMLDivElement>(null);
  const manager = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const firstRun = useRef(true);

  // Banner until a choice exists, manager button after.
  useEffect(() => {
    const initial = firstRun.current;
    firstRun.current = false;
    if (!stored) {
      if (banner.current) play(banner.current, show('flex', '100px', false));
    } else {
      if (banner.current && !initial) play(banner.current, hide('100px', false));
      if (manager.current) play(manager.current, show('block', '100px'));
    }
  }, [stored]);

  useEffect(() => {
    const el = prefs.current;
    if (!el) return;
    if (prefsOpen) {
      play(el, show('flex', '20px'));
      el.querySelector<HTMLElement>('.fs-cc-prefs_close')?.focus();
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPrefsOpen(false);
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden'; // fs-cc-scroll="disable"
      return () => {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    }
    if (el.style.display === 'flex') {
      play(el, hide('20px'));
      opener.current?.focus();
    }
  }, [prefsOpen]);

  const save = (choices: Choices) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
    } catch {
      // storage blocked: the choice still holds for this visit
    }
    setDraft(choices);
    setStored(choices);
    setPrefsOpen(false);
  };
  const openPrefs = (e: MouseEvent) => {
    e.preventDefault();
    opener.current = e.currentTarget as HTMLElement;
    setDraft(stored ?? NONE);
    setPrefsOpen(true);
  };
  const act = (choices: Choices) => (e: MouseEvent) => {
    e.preventDefault();
    save(choices);
  };

  return (
    <div className="ff-cc-components">
      <div ref={banner} className="fs-cc-banner_component" role="region" aria-label="Persetujuan cookie">
        <div className="fs-cc-banner_container">
          <div className="fs-cc-banner_text">
            Dengan mengklik <strong className="bold-text">“Terima”</strong>, kamu setuju cookie disimpan di perangkatmu untuk
            memudahkan navigasi, menganalisis pemakaian situs, dan membantu pemasaran kami. Baca{' '}
            <a href="#" className="fs-cc-banner_text-link">
              Kebijakan Cookie{' '}
            </a>
            untuk info lebih lanjut.
          </div>
          <div className="fs-cc-banner_buttons-wrapper">
            <a href="#" className="fs-cc-banner_text-link margin-right-8" onClick={openPrefs}>
              Pengaturan
            </a>
            <div className="cookierow">
              <a href="#" role="button" className="whitebutton cookiebutton w-button" onClick={act(NONE)}>
                Tolak
              </a>
              <a href="#" role="button" className="button cookiebutton w-button" onClick={act(ALL)}>
                Terima
              </a>
            </div>
            <button type="button" className="fs-cc-banner_close" aria-label="Tutup dan tolak" onClick={() => save(NONE)}>
              <div className="fs-cc-banner_close-icon w-embed">
                <CloseIcon viewBox="0 0 16 16" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div ref={manager} className="fs-cc-manager_component">
        <button type="button" className="fs-cc-manager_button" aria-label="Pengaturan cookie" onClick={openPrefs}>
          <img src="/assets/cookie-manager.svg" alt="" className="fs-cc-manager_icon" />
        </button>
      </div>

      <div ref={prefs} className="fs-cc-prefs_component w-form" role="dialog" aria-modal="true" aria-labelledby="fs-cc-prefs-title">
        <form
          className="fs-cc-prefs_form"
          onSubmit={(e) => {
            e.preventDefault();
            save(draft);
          }}
        >
          <button type="button" className="fs-cc-prefs_close" aria-label="Tutup pengaturan" onClick={() => setPrefsOpen(false)}>
            <div className="fs-cc-prefs_close-icon w-embed">
              <CloseIcon viewBox="0 0 16 24" />
            </div>
          </button>
          <div className="fs-cc-prefs_content">
            <div className="fs-cc-prefs_space-small margin-bottom-12">
              <div id="fs-cc-prefs-title" className="fs-cc-prefs_title">
                Pusat Preferensi Privasi
              </div>
            </div>
            <div className="fs-cc-prefs_space-small">
              <div className="fs-cc-prefs_text">
                Saat kamu membuka situs, situs itu bisa menyimpan atau membaca data di browser-mu. Penyimpanan ini sering dibutuhkan agar
                situs berfungsi. Data ini juga bisa dipakai untuk pemasaran, analitik, dan personalisasi, misalnya menyimpan pilihanmu.
                Privasi itu penting bagi kami, jadi kamu bisa mematikan jenis penyimpanan yang tidak wajib untuk fungsi dasar situs.
                Memblokir kategori tertentu bisa memengaruhi pengalamanmu di situs ini.{' '}
                <a href="#">Kebijakan Privasi</a>
              </div>
            </div>
            <div className="fs-cc-prefs_space-medium">
              <a href="#" role="button" className="whitebutton cookiebutton w-button" onClick={act(NONE)}>
                Tolak semua cookie
              </a>
              <a href="#" role="button" className="button cookiebutton w-button" onClick={act(ALL)}>
                Izinkan semua cookie
              </a>
            </div>
            <div className="fs-cc-prefs_space-small margin-bottom-12">
              <div className="fs-cc-prefs_title">Atur Persetujuan per Kategori</div>
            </div>
            <div className="fs-cc-prefs_option">
              <div className="fs-cc-prefs_toggle-wrapper">
                <div className="fs-cc-prefs_label">Wajib</div>
                <div className="cookie-badge">
                  <div className="fs-cc-prefs_text blue">Selalu aktif</div>
                </div>
              </div>
              <div className="fs-cc-prefs_text">Data ini dibutuhkan agar fungsi dasar situs bisa berjalan.</div>
            </div>
            {OPTIONAL.map(({ id, label, text }) => (
              <div key={id} className="fs-cc-prefs_option">
                <div className="fs-cc-prefs_toggle-wrapper">
                  <div className="fs-cc-prefs_label">{label}</div>
                  {/* IX2 "Preferences Checkbox [CHECK]/[UNCHECK]": knob slides 20px, track turns navy */}
                  <label
                    className="w-checkbox fs-cc-prefs_checkbox-field"
                    style={{ backgroundColor: draft[id] ? '#151b31' : '#cccccc', transition: 'background-color 200ms ease' }}
                  >
                    <input
                      type="checkbox"
                      className="w-checkbox-input fs-cc-prefs_checkbox"
                      checked={draft[id]}
                      onChange={(e) => setDraft({ ...draft, [id]: e.target.checked })}
                    />
                    <span className="fs-cc-prefs_checkbox-label w-form-label">{label}</span>
                    <div className="fs-cc-prefs_toggle" style={{ translate: draft[id] ? '20px 0px' : '0px 0px', transition: 'translate 250ms ease' }} />
                  </label>
                </div>
                <div className="fs-cc-prefs_text">{text}</div>
              </div>
            ))}
            <div className="fs-cc-prefs_buttons-wrapper">
              <button type="submit" className="button smallbutton w-button">
                Simpan pilihan dan tutup
              </button>
            </div>
          </div>
        </form>
        <div className="fs-cc-prefs_overlay" onClick={() => setPrefsOpen(false)} />
      </div>
    </div>
  );
}
