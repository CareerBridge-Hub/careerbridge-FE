import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// The dashboard is a second page at /app/ with client-side routes, so deep links
// like /app/pekerjaan/3 must serve app/index.html (vercel.json does the same in production).
const appFallback: Connect.NextHandleFunction = (req, _res, next) => {
  const path = req.url?.split('?')[0] ?? ''
  if (path.startsWith('/app') && !path.includes('.')) req.url = '/app/index.html'
  next()
}
const appRoutes: Plugin = {
  name: 'app-routes',
  configureServer: (server) => void server.middlewares.use(appFallback),
  configurePreviewServer: (server) => void server.middlewares.use(appFallback),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), appRoutes],
  resolve: { alias: { '@': root('./src') } },
  build: {
    rollupOptions: {
      input: { main: root('./index.html'), app: root('./app/index.html') },
    },
  },
})
