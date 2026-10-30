import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'redirect-login',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/login' || req.url === '/login/')) {
            res.writeHead(302, { Location: 'http://localhost:3000' });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});

