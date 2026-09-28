import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function publicDirectoryIndex(): Plugin {
  return {
    name: 'public-directory-index',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const [pathname, query] = req.url.split('?');
          const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
          if (trimmed) {
            const candidate = path.join(server.config.publicDir, trimmed, 'index.html');
            if (fs.existsSync(candidate)) {
              req.url = `${trimmed}/index.html${query ? `?${query}` : ''}`;
            }
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), publicDirectoryIndex()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['motion/react'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
