import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      {
        name: 'disable-vite-hmr-client',
        enforce: 'post',
        transform(code: string, id: string) {
          if (id.includes('client.mjs') || id.includes('@vite/client')) {
            return code
              .replace(
                'transport.connect(createHMRHandler(handleMessage));',
                '/* HMR disabled in sandbox */'
              )
              .replace(
                /console\.error\(`\[vite\] failed to connect to websocket[^`]*`\);/g,
                '/* silenced */'
              )
              .replace(
                /console\.error\("\[vite\]", err\)/g,
                'console.debug("[vite]", err)'
              );
          }
        }
      },
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifestFilename: 'manifest.json',
        devOptions: {
          enabled: true
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'screenshot-mobile.png', 'screenshot-desktop.png', 'manifest.json'],
        manifest: {
          name: 'TuCATalogo',
          short_name: 'TuCATalogo',
          description: 'Catálogo Digital Moderno para Cuba',
          theme_color: '#ea580c',
          background_color: '#ffffff',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen', 'minimal-ui'],
          start_url: '/',
          id: '/',
          scope: '/',
          orientation: 'portrait-primary',
          icons: [
            {
              src: 'https://res.cloudinary.com/vj0gqfr2/image/upload/e_make_transparent:15/w_192,h_192,c_pad,b_transparent,f_png/v1786222701/tucatalogo/logos/j3jtcxae5vzmqdaw2vj3.jpg',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://res.cloudinary.com/vj0gqfr2/image/upload/e_make_transparent:15/w_512,h_512,c_pad,b_transparent,f_png/v1786222701/tucatalogo/logos/j3jtcxae5vzmqdaw2vj3.jpg',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://res.cloudinary.com/vj0gqfr2/image/upload/e_make_transparent:15/w_180,h_180,c_pad,b_transparent,f_png/v1786222701/tucatalogo/logos/j3jtcxae5vzmqdaw2vj3.jpg',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            }
          ],
          screenshots: [
            {
              src: '/screenshot-mobile.png',
              sizes: '390x844',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Catálogo en Móvil'
            },
            {
              src: '/screenshot-desktop.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Catálogo en Escritorio'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/.*\.png$/, /^\/.*\.ico$/, /^\/manifest\.json$/, /^\/sw\.js$/]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
    },
  };
});
