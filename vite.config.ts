import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/audio': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/editor': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/blog': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/demucs-web': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
