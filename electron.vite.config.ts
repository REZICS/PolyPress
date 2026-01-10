import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

import 'dotenv/config'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
        formats: ['es']
      }
    }
  },

  preload: {
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        formats: ['cjs']
      }
    }
  },

  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    server: {
      port: process.env.VITE_DEV_SERVER_PORT ? parseInt(process.env.VITE_DEV_SERVER_PORT) : 5173
    },
    plugins: [react()],
    build: {
      outDir: resolve(__dirname, 'out/renderer')
    }
  }
})
