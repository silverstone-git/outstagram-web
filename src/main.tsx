import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// /admin/ is the outsie admin panel: its own lazily loaded bundle, gated server-side (OUTSIE_ADMIN_EMAILS).
const AdminApp = lazy(() => import('./features/admin/AdminApp.tsx'))
const base = import.meta.env.BASE_URL.replace(/\/$/, '')
const rest = window.location.pathname.slice(base.length).replace(/^\/|\/$/g, '')
// If Supabase sent the admin's Google sign-in back to the site root (redirect URL not allow-listed), finish it on /admin/.
if (rest !== 'admin' && sessionStorage.getItem('outsie_admin_pkce') && new URLSearchParams(window.location.search).has('code')) {
  window.location.replace(`${base}/admin/${window.location.search}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rest === 'admin'
      ? <Suspense fallback={null}><AdminApp /></Suspense>
      : <App />}
  </StrictMode>,
)
