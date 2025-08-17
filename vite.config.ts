import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'

function figmaAndVersionResolver() {
  return {
    name: 'figma-and-version-resolver',
    enforce: 'pre' as const,
    resolveId(source: string) {
      if (source.startsWith('figma:asset/')) {
        return path.resolve(__dirname, 'src/assets/riverbit-logo.svg')
      }
      if (source.startsWith('jsr:@supabase/supabase-js@')) {
        return '@supabase/supabase-js'
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [figmaAndVersionResolver(), react()],
  server: {
    port: 5173,
    open: true,
    watch: {
      ignored: [
        '**/contracts/**',
        '**/node_modules/**',
        '**/.git/**'
      ]
    }
  },
  assetsInclude: ['**/*.svg'],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          wagmi: ['wagmi', '@reown/appkit', '@reown/appkit-adapter-wagmi']
        }
      }
    }
  }
})


