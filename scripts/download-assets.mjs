// Pulls every asset tracky.so uses (images, fonts, lottie, favicons) into public/assets
// and writes the original Webflow CSS, with CDN urls rewritten, to src/styles/.
// Usage: node scripts/download-assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGE = 'https://www.tracky.so/';
const CDN_PREFIX = 'https://cdn.prod.website-files.com/';
const CSS_FILES = {
  'webflow.shared.css': 'https://cdn.prod.website-files.com/63299a8fe533fa6c7b120e51/css/trackyso.webflow.shared.4f5c0db2c.min.css',
  'webflow.page.css': 'https://cdn.prod.website-files.com/63299a8fe533fa6c7b120e51/css/trackyso.webflow.636a0d5004b5b09329ee7531.940de6dde.opt.min.css',
};

// HTML attribute values ("…/Group%204335544%20(1).png") and CSS url() bodies, where
// parens are backslash-escaped. \x5c is a literal backslash.
const CSS_URL = /url\(("?)((?:\x5c.|[^"\x5c)])+)\1\)/g;
const htmlRefs = (s) =>
  [...s.matchAll(/(?:src|href|data-src|content|srcset)="([^"]+)"/g)].flatMap((m) =>
    m[1].split(/,\s+/).map((x) => x.trim().split(/\s+/)[0]),
  );
const cssRefs = (s) => [...s.matchAll(CSS_URL)].map((m) => m[2]);
const clean = (raw) => raw.replace(/&amp;/g, '&').replace(/\x5c(.)/g, '$1');

const text = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
};

const html = await text(PAGE);
const css = Object.fromEntries(
  await Promise.all(Object.entries(CSS_FILES).map(async ([name, url]) => [name, await text(url)])),
);

const urls = new Set(
  [...htmlRefs(html), ...Object.values(css).flatMap(cssRefs)]
    .filter((r) => r.startsWith(CDN_PREFIX))
    .map(clean)
    .filter((u) => !/\/(css|js)\//.test(u) && !/-p-\d+\./.test(u)), // skip css/js and srcset variants
);

// "63299d..._Group%2041212.svg" -> "group-41212.svg"
const taken = new Set();
const localName = (url) => {
  const base = decodeURIComponent(url.split('/').pop().split('?')[0]).replace(/^[0-9a-f]{24}_/, '');
  const ext = path.extname(base).toLowerCase();
  const stem =
    path.basename(base, path.extname(base)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'asset';
  let name = stem + ext;
  for (let i = 2; taken.has(name); i++) name = `${stem}-${i}${ext}`;
  taken.add(name);
  return name;
};

const map = Object.fromEntries([...urls].sort().map((u) => [u, `/assets/${localName(u)}`]));
await fs.mkdir(path.join(ROOT, 'public/assets'), { recursive: true });

const queue = Object.entries(map);
const failed = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let job; (job = queue.shift()); ) {
      const [url, local] = job;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        await fs.writeFile(path.join(ROOT, 'public', local), Buffer.from(await res.arrayBuffer()));
      } catch (e) {
        failed.push(`${url} (${e.message})`);
      }
    }
  }),
);

const rewrite = (s) => s.replace(CSS_URL, (all, q, raw) => (map[clean(raw)] ? `url(${map[clean(raw)]})` : all));
await fs.mkdir(path.join(ROOT, 'src/styles'), { recursive: true });
for (const [name, body] of Object.entries(css)) await fs.writeFile(path.join(ROOT, 'src/styles', name), rewrite(body));
await fs.writeFile(path.join(ROOT, 'scripts/asset-map.json'), JSON.stringify(map, null, 2));

console.log(`downloaded ${Object.keys(map).length - failed.length}/${Object.keys(map).length}`);
if (failed.length) console.log('failed:\n' + failed.join('\n'));
