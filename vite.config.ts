import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import fs from 'node:fs'
import path from 'node:path'

// Public pages get real URLs on any static host (no SPA fallback needed): dist/<page>/index.html is a
// copy of the app shell, which renders the page from the pathname (src/features/public/routes.ts).
// p/ and u/ hold share links (/p/?id=..., /u/?name=...), which the Android app also opens (App Links).
// admin/ is the admin panel (src/features/admin, lazily loaded).
// signin/ is the magic link in the code email (/signin/?h=...), also an Android App Link.
const PUBLIC_PAGES = ['pricing', 'terms', 'privacy', 'refunds', 'contact', 'p', 'u', 'signin', 'admin'];
const publicPages = (): Plugin => ({
  name: 'public-pages',
  apply: 'build',
  closeBundle() {
    const dist = path.resolve(__dirname, 'dist');
    const html = fs.readFileSync(path.join(dist, 'index.html'));
    for (const p of PUBLIC_PAGES) {
      fs.mkdirSync(path.join(dist, p), { recursive: true });
      fs.writeFileSync(path.join(dist, p, 'index.html'), html);
    }
  },
});

// VITE_BASE lets the same build live under a sub-path (e.g. /outstagram/ on aryan.cfd previews).
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), publicPages()],
})
