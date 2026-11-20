import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(() => {
  return {
    base: '/',
    build: {
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            coreui: ['@coreui/react', '@coreui/icons-react'],
          },
        },
      },
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'local-report-print',
        configureServer(server) {
          server.middlewares.use('/__local-report-pdf', async (req, res) => {
            const origin = req.headers.origin
            const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/
            if (req.method !== 'POST' || !localOrigin.test(origin || '') ||
                origin !== 'http://' + req.headers.host || req.headers['x-local-report'] !== '1') {
              res.writeHead(403).end()
              return
            }
            try {
              let body = ''
              for await (const chunk of req) {
                body += chunk
                if (body.length > 4096) return res.writeHead(413).end()
              }
              const url = new URL(body)
              const reportPath = /^\/v0\/b\/tarbiyah-sms\.firebasestorage\.app\/o\/reportCards%2Fapproved%2F[^/]+\.pdf$/i
              if (url.origin !== 'https://firebasestorage.googleapis.com' ||
                  !reportPath.test(url.pathname) || url.searchParams.get('alt') !== 'media' ||
                  !url.searchParams.get('token') || url.username || url.password) {
                return res.writeHead(400).end()
              }
              const upstream = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) })
              if (!upstream.ok) return res.writeHead(upstream.status).end()
              res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' })
              res.end(Buffer.from(await upstream.arrayBuffer()))
            } catch {
              if (!res.headersSent) res.writeHead(502)
              res.end()
            }
          })
        },
      },
    ],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      host: true, // Allow external connections
      hmr: {
        port: 3000, // Use the same port for HMR
        host: 'localhost'
      },
      proxy: {
        // https://vitejs.dev/config/server-options.html
      },
    },
    // Ensure environment variables are properly loaded
    define: {
      'process.env': {}
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}'],
    },
  }
})
