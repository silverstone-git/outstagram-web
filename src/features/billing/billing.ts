import { API_BASE_URL, OutstagramAPI } from '../../services/api';
import { fetchWithHandling, handleResponse } from '../../services/handle-response';

export type PaywallCode = 'ai_quota' | 'tutor_threads' | 'tutor_storage' | 'media_too_large' | 'video_not_allowed'
  | 'posts_limit' | 'ai_options' | 'ai_model' | 'manual';
/** `needs`: the plan that lifts the limit (highlighted in the sheet). */
export interface PaywallDetail { code: PaywallCode; message?: string; needs?: PlanId; [k: string]: unknown }

export type PlanId = 'free' | 'pro' | 'contributor';
export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, contributor: 2 };
/** null = unlimited; video_bytes 0 = no videos (lib/plans.py on the server). */
export interface Limits {
  ai_prompts_per_hour: number | null; tutor_threads: number | null; tutor_bytes: number | null; media_bytes: number;
  video_bytes?: number | null; media_per_post?: number | null; posts?: number | null;
}
export interface PlanInfo { id: PlanId; name: string; price: number; currency: string; days: number | null; limits: Limits }
export interface BillingStatus {
  plan: PlanId;
  plans?: PlanInfo[];
  posts?: number;
  valid_until: string | null;
  limits: Limits;
  free_limits: Limits;
  pro_limits: Limits;
  usage: { ai: { limit: number | null; used: number; remaining: number | null; unlimited?: boolean; resets_at: string | null }; tutor_threads: number; tutor_bytes: number };
  payments_enabled: boolean;
  test_mode: boolean;
  price: { amount: number; currency: string; days: number };
}
interface Order {
  key_id: string; order_id: string; amount: number; currency: string; name: string; description: string;
  prefill: { name?: string; email?: string }; test_mode: boolean;
}
export interface RazorpayResult { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }

/** Opens the upgrade sheet from anywhere (the sheet is mounted once in App). */
export function openPaywall(detail: PaywallDetail) {
  window.dispatchEvent(new CustomEvent<PaywallDetail>('paywall', { detail }));
}

/** The plans in the status (older servers: free + pro from the old fields). */
export function plansOf(s: BillingStatus): PlanInfo[] {
  if (s.plans?.length) return s.plans;
  return [
    { id: 'free', name: 'Free', price: 0, currency: s.price.currency, days: null, limits: s.free_limits },
    { id: 'pro', name: 'Outstagram Pro', price: s.price.amount, currency: s.price.currency, days: s.price.days, limits: s.pro_limits },
  ];
}

/** "Pro", "Contributor". */
export const shortName = (p: PlanInfo) => (p.id === 'free' ? 'Free' : p.name.split(' ').pop()!);

/** If `r` is a paywall response (402/403/413/429 with detail.upgrade), open the sheet and return its detail. */
export async function paywallFrom(r: Response): Promise<PaywallDetail | null> {
  if (![402, 403, 413, 429].includes(r.status)) return null;
  const body = await r.clone().json().catch(() => null);
  const d = body?.detail;
  if (d && typeof d === 'object' && d.upgrade) {
    openPaywall(d as PaywallDetail);
    return d as PaywallDetail;
  }
  return null;
}

export const BillingAPI = {
  async status(): Promise<BillingStatus | null> {
    const r = await fetchWithHandling(`${API_BASE_URL}/billing/status`, { headers: OutstagramAPI.getAuthHeaders() });
    return handleResponse<BillingStatus>(r);
  },
  async order(reason: string, plan: Exclude<PlanId, 'free'> = 'pro'): Promise<Order> {
    const r = await fetchWithHandling(`${API_BASE_URL}/billing/razorpay/order`, {
      method: 'POST', headers: OutstagramAPI.getAuthHeaders(), body: JSON.stringify({ reason, plan }),
    });
    if (r.status === 503) throw new Error('Payments are not set up on this server yet.');
    if (r.status === 409) throw new Error((await r.json().catch(() => null))?.detail || 'You already have a higher plan.');
    const d = await handleResponse<Order>(r);
    if (!d) throw new Error('Could not start the payment');
    return d;
  },
  async verify(res: RazorpayResult): Promise<BillingStatus['plan']> {
    const r = await fetchWithHandling(`${API_BASE_URL}/billing/razorpay/verify`, {
      method: 'POST', headers: OutstagramAPI.getAuthHeaders(), body: JSON.stringify(res),
    });
    const d = await handleResponse<{ plan: BillingStatus['plan'] }>(r);
    return d?.plan ?? 'free';
  },
};

// --- Razorpay Checkout -----------------------------------------------------------------------------

interface RazorpayInstance { open(): void; on(ev: string, cb: (r: { error?: { description?: string } }) => void): void }
declare global { interface Window { Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance } }

let loading: Promise<void> | null = null;
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error('Could not load Razorpay. Check your connection.')); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Creates an order, opens Razorpay Checkout and verifies the payment server-side. Resolves with
 *  the new plan, or null if the user closed the checkout. */
export async function buyPro(reason: string, onBeforeOpen?: () => void,
                             plan: Exclude<PlanId, 'free'> = 'pro'): Promise<BillingStatus['plan'] | null> {
  const [order] = await Promise.all([BillingAPI.order(reason, plan), loadCheckout()]);
  if (!window.Razorpay) throw new Error('Razorpay did not load');
  const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#047857';
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
      name: order.name, description: order.description, prefill: order.prefill,
      theme: { color }, notes: { reason },
      handler: (res: RazorpayResult) => { BillingAPI.verify(res).then(resolve, reject); },
      modal: { ondismiss: () => resolve(null), confirm_close: true },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
    // Any open modal (our paywall sheet) traps focus and pointer events, which makes Checkout's
    // inputs unclickable: close it first, and give it a frame to release body pointer-events.
    onBeforeOpen?.();
    window.setTimeout(() => {
      document.body.style.pointerEvents = '';
      rzp.open();
    }, 350);
  });
}
