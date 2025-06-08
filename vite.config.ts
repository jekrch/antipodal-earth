import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa' // <-- Import the PWA plugin

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    
    // Add the VitePWA plugin here
    VitePWA({
      // This setting will automatically update the service worker
      // without prompting the user.
      registerType: 'autoUpdate',
      
      // Configuration for the web app manifest
      // This is what allows users to "install" your app
      manifest: {
        name: 'JuxtaGlobe',
        short_name: 'JuxtaGlobe',
        description: "Compare Earth's present with its past or its opposite point.",
        theme_color: '#18181b', // A dark theme color to match your app
        // Add your app icons here. You'll need to create these image files
        // and place them in your 'public' directory.
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          }
        ]
      },
      
      // This is the Workbox configuration for runtime caching
      workbox: {
        runtimeCaching: [
          {
            // This is the rule for caching OpenStreetMap tiles
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openstreetmap-tiles',
              // This is the crucial fix for the CORS error
              cacheableResponse: {
                statuses: [0, 200], // Cache opaque (status 0) and OK (status 200) responses
              },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
            },
          },
          // You can add more caching rules here for other assets if needed
        ],
      },
    }),
  ],
  base: '/'
})