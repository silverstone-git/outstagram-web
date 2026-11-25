import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../services/api';

/** null = unlimited; video_bytes 0 = no videos. */
export type PlanLimits = {
  ai_prompts_per_hour: number | null; tutor_threads: number | null; tutor_bytes: number | null; media_bytes: number;
  video_bytes?: number | null; media_per_post?: number | null; posts?: number | null;
};
export type PublicPlans = {
  currency: string;
  plans: { id: 'free' | 'pro' | 'contributor'; name?: string; price: number; days: number | null; limits: PlanLimits }[];
};

/** Live price list from outsie (GET /billing/plans); null while loading or if the server is unreachable. */
export function usePlans() {
  const [plans, setPlans] = useState<PublicPlans | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch(`${API_BASE_URL}/billing/plans`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPlans)
      .catch(() => setFailed(true));
  }, []);
  return { plans, failed };
}

/** Real question-bank size from the public topics endpoint; null if unavailable. */
export function useBankSize() {
  const [size, setSize] = useState<{ questions: number; topics: number } | null>(null);
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/question_bank/topics`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: { count: number }[]) => {
        if (Array.isArray(rows)) {
          const withQs = rows.filter((r) => r.count > 0);
          setSize({ questions: withQs.reduce((a, r) => a + r.count, 0), topics: withQs.length });
        }
      })
      .catch(() => {});
  }, []);
  return size;
}

export const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);

export const bytes = (n: number) => (n >= 1_000_000 ? `${Math.round(n / 1_000_000)} MB` : `${Math.round(n / 1000)} kB`);

/** "Unlimited" for null. */
export const limit = (n: number | null | undefined, fmt: (n: number) => string = (x) => x.toLocaleString('en-IN')) =>
  n == null ? 'Unlimited' : fmt(n);
