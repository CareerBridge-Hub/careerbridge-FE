import { useState } from 'react';

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
              <p className="notification-bar-text">Segera bisa dicoba!</p>
              <div className="notification-bar-text span">Hubungi kami</div>
              <img src="/assets/arrowupright.svg" alt="" />
            </div>
          </div>
          <button type="button" className="notification-close-button" aria-label="Tutup pengumuman" onClick={() => setOpen(false)} />
          <a href="mailto:tildemtokdemir@gmail.com" className="notification-link w-inline-block" aria-label="Segera bisa dicoba, hubungi kami" />
        </div>
      )}
    </div>
  );
}
