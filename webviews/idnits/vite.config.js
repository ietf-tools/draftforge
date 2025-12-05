import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    Icons({
      compiler: 'vue3'
    })
  ],
  build: {
    outDir: '../../media/webviews/idnits',
    emptyOutDir: true,
    lib: {
      entry: 'app.js',
      formats: ['es'],
      fileName: (format, entryName) => `app.js`,
      cssFileName: 'app'
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
