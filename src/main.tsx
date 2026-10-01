import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/webflow.shared.css';
import './styles/webflow.page.css';
import './styles/custom.css';
import { App } from './App';

// Webflow's own bootstrap flags; a few shared-CSS rules key off them.
document.documentElement.classList.add('w-mod-js', 'w-mod-ix');
if ('ontouchstart' in window) document.documentElement.classList.add('w-mod-touch');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
