# CareerBridge

CareerBridge landing page (React + Vite), built on top of a rebuilt Webflow landing template.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build
npm run lint
```

## How it's put together

- `src/styles/webflow.*.css` — the original Webflow stylesheets, unchanged except for asset urls.
  Components use the original class names, so layout and responsive behaviour come from here.
- `src/styles/custom.css` — the site's custom-code embeds (scrollbar, typed cursor, marquee) plus a few
  resets for elements that became real `<button>`s.
- `src/lib/ix.ts` — a small replacement for Webflow Interactions on the Web Animations API. Each component
  declares its timelines as data transcribed from the original IX2 config
  (`../docs/research/tracky.so/ix2-summary.txt`).
- `src/components/` — one file per page region; `Showcase.tsx` holds the four feature blocks,
  `Outro.tsx` the cat, marquee and footer.
- `public/assets/` — every image, font and the confetti Lottie, pulled by `npm run download-assets`.

## QA

`npm run qa` drives the built site in headless Chrome (remote debugging on port 9222, preview server on
4173) and checks typing, tabs, card hover, slider autoplay, the announcement close and cookie consent.
