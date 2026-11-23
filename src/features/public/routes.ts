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

// Business contact details shown on the policy pages and footer.
export const CONTACT = {
  brand: 'Outstagram',
  email: 'me@aryan.cfd',
  phone: '+91 99715 04957',
  phoneHref: 'tel:+919971504957',
  country: 'India',
};
