import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function rewriteClientRoutes(server: { middlewares: { use: (handler: (req: { url?: string }, _res: unknown, next: () => void) => void) => void } }) {
  server.middlewares.use((req, _res, next) => {
    const path = req.url?.split('?')[0] || ''
    if (/^\/(dashboard|markets|wallet|portfolio|profile|admin|login|register)(\/|$)/.test(path)) {
      req.url = '/index.html'
    }
    next()
  })
}

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
  },
  plugins: [
    react(),
    {
      name: 'spa-client-route-rewrite',
      configureServer: rewriteClientRoutes,
      configurePreviewServer: rewriteClientRoutes,
    },
  ],
})
