// Public pages live at real paths (/pricing, /terms, ...) without a router: vite.config.ts copies
// index.html into each folder at build time, and the app picks the page from the pathname.
export const PUBLIC_PAGES = ['pricing', 'terms', 'privacy', 'refunds', 'contact'] as const;
export type PublicPage = (typeof PUBLIC_PAGES)[number];

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function currentPublicPage(): PublicPage | null {
  const rest = window.location.pathname.slice(base.length).replace(/^\/|\/$/g, '').split('/')[0];
  return (PUBLIC_PAGES as readonly string[]).includes(rest) ? (rest as PublicPage) : null;
}

export const pageHref = (p: PublicPage | '') => `${base}/${p ? `${p}/` : ''}`;

// Share links: <base>/p/?id=<post id> and <base>/u/?name=<username>. Real folders (vite.config.ts copies the
// app shell into them), so no SPA fallback is needed; the Android app opens the same URLs (App Links).
function linkParam(folder: string, key: string): string | null {
  const rest = window.location.pathname.slice(base.length).replace(/^\/|\/$/g, '');
  return rest === folder ? new URLSearchParams(window.location.search).get(key) : null;
}
export const sharedPostId = () => linkParam('p', 'id');
export const sharedProfileName = () => linkParam('u', 'name');
export const profileHref = (name: string) => `${window.location.origin}${base}/u/?name=${encodeURIComponent(name)}`;
export const postHref = (id: string) => `${window.location.origin}${base}/p/?id=${encodeURIComponent(id)}`;

// Business contact details shown on the policy pages and footer.
export const CONTACT = {
  brand: 'Outstagram',
  // Sole proprietor until a company is registered; add the registered address then.
  legalName: 'Aryan Sidhwani',
  email: 'me@aryan.cfd',
  phone: '+91 99715 04957',
  phoneHref: 'tel:+919971504957',
  country: 'India',
};

// Native apps. The Android APK is the latest build CI publishes to the public bucket (outstagram-mobile
// publish-apk job; the same URL always holds the newest one) until the app is on the Play Store.
export const APPS = {
  androidApk: 'https://outsiebucket.aryan.cfd/apps/outstagram.apk',
};
