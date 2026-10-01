// Interaction smoke test: drives the built site in Chrome and asserts the DOM state after
// typing, preview video, card hover, slider autoplay, notification close and cookie consent.
// Needs Chrome with remote debugging and the preview server:
//   chrome --headless=new --remote-debugging-port=9222 --user-data-dir=<tmp>
//   npm run build && npm run preview -- --port 4173
//   npm run qa
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
const p = await b.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle2' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $eval = (fn, ...a) => p.evaluate(fn, ...a);

// typed text cycles
const t1 = await $eval(() => document.querySelector('.typed-words').textContent);
await sleep(700);
const t2 = await $eval(() => document.querySelector('.typed-words').textContent);
assert.notEqual(t1, t2, 'typed text should change');

// preview video plays once scrolled into view
await p.evaluate(() => document.querySelector('.tabsection video').scrollIntoView({ block: 'center' }));
await sleep(1500);
assert.equal(await $eval(() => document.querySelector('.tabsection video').paused), false, 'preview video should play in view');

// card hover fans card1 out
await p.evaluate(() => document.querySelector('.cardtabwrap').scrollIntoView({ block: 'center' }));
await sleep(1500);
await p.hover('.cardtab:nth-child(1)');
await sleep(500);
const fan = await $eval(() => {
  const c = getComputedStyle(document.querySelector('.card.card1'));
  return { t: c.translate, r: c.rotate, bg: getComputedStyle(document.querySelector('.cardtab')).backgroundColor };
});
assert.deepEqual(fan, { t: '-129px 40px', r: '-4deg', bg: 'rgb(229, 229, 229)' });

// reviews autoplay
const idx = () => $eval(() => [...document.querySelectorAll('.w-slide')].findIndex((s) => s.style.opacity === '1'));
const i0 = await idx();
await sleep(5600);
assert.equal(await idx(), (i0 + 1) % 6, 'slider should advance after 5s');

// notification close
await p.evaluate(() => scrollTo(0, 0));
await p.click('.notification-close-button');
assert.equal(await $eval(() => !!document.querySelector('.notification-bar-section')), false);

// cookie: accept -> banner hides, manager shows, choice stored
await p.click('.fs-cc-banner_component .button.cookiebutton');
await sleep(800);
const ck = await $eval(() => ({
  banner: getComputedStyle(document.querySelector('.fs-cc-banner_component')).display,
  manager: getComputedStyle(document.querySelector('.fs-cc-manager_component')).display,
  stored: localStorage.getItem('fs-cc'),
}));
assert.deepEqual(ck, { banner: 'none', manager: 'block', stored: '{"marketing":true,"personalization":true,"analytics":true}' });
await p.click('.fs-cc-manager_button');
await sleep(600);
assert.equal(await $eval(() => getComputedStyle(document.querySelector('.fs-cc-prefs_component')).display), 'flex');
await p.keyboard.press('Escape');
await sleep(700);
assert.equal(await $eval(() => getComputedStyle(document.querySelector('.fs-cc-prefs_component')).display), 'none');

// after reload with a stored choice: no banner
await p.reload({ waitUntil: 'networkidle2' });
await sleep(600);
assert.equal(await $eval(() => getComputedStyle(document.querySelector('.fs-cc-banner_component')).display), 'none');
await p.evaluate(() => localStorage.clear());

console.log('all interaction checks passed; errors:', errors);
await p.close();
b.disconnect();
