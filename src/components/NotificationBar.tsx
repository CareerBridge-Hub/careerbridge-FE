import { useState } from 'react';
import { APP_URL } from '../lib/site';

export function NotificationBar() {
  const [open, setOpen] = useState(true);

  return (
    <div className="notification-bar-wrapper">
      <div className="navbar-animation-trigger" />
      {open && (
        <div className="section-2 notification-bar-section">
          <div className="container-2 landscape-padding-0">
            <div className="notification-bar">
              <img src="/assets/fire-2.svg" alt="" />
              <p className="notification-bar-text">CareerBridge sudah rilis!</p>
              <div className="notification-bar-text span">Coba sekarang</div>
              <img src="/assets/arrowupright.svg" alt="" />
            </div>
          </div>
          <button type="button" className="notification-close-button" aria-label="Tutup pengumuman" onClick={() => setOpen(false)} />
          <a href={`${APP_URL}daftar`} className="notification-link w-inline-block" aria-label="CareerBridge sudah rilis, coba sekarang" />
        </div>
      )}
    </div>
  );
}
