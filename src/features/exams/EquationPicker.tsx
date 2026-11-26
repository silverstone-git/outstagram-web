import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Check, Copy, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExamAPI, type FavoriteEquation } from './examApi';

export interface PickedEquation { latex: string; display: boolean }

/** Where an equation was saved from, so "Saved equations" can jump back to it. */
export type EquationSource = Pick<FavoriteEquation, 'skill' | 'context' | 'attempt_id' | 'question_id' | 'message_id' | 'post_id' | 'source'>;

/** LaTeX source of a rendered KaTeX node (KaTeX keeps it in a MathML annotation). */
export function equationAt(target: EventTarget | null): { el: HTMLElement; eq: PickedEquation } | null {
  const node = target instanceof Element ? target : null;
  const display = node?.closest('.katex-display') as HTMLElement | null;
  const inline = node?.closest('.katex') as HTMLElement | null;
  const el = display ?? inline;
  if (!el) return null;
  const tex = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
  return tex ? { el, eq: { latex: tex, display: !!display } } : null;
}

const HOLD_MS = 420;

/** Long-press (touch) or right-click (mouse) any equation inside to open the equation menu. */
export function EquationZone({ meta, children, className, as: Tag = 'div' }: {
  meta: EquationSource | (() => EquationSource);
  children: ReactNode;
  className?: string;
  as?: 'div' | 'span';
}) {
  const timer = useRef<number | null>(null);
  const pressed = useRef<{ el: HTMLElement; x: number; y: number } | null>(null);
  const firedAt = useRef(0);
  const [picked, setPicked] = useState<{ eq: PickedEquation; rect: DOMRect; host: HTMLElement } | null>(null);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    pressed.current?.el.classList.remove('fav-pressing');
    pressed.current = null;
  };
  const fire = (el: HTMLElement, eq: PickedEquation) => {
    if (Date.now() - firedAt.current < 800) return; // long-press also fires contextmenu on Android
    firedAt.current = Date.now();
    navigator.vibrate?.(15);
    // Inside a modal drawer/dialog, outside clicks are blocked and would close it: render in there.
    const host = (el.closest('[role="dialog"]') as HTMLElement | null) ?? document.body;
    setPicked({ eq, rect: el.getBoundingClientRect(), host });
  };
  const down = (e: RPointerEvent) => {
    if (e.button > 0) return;
    const hit = equationAt(e.target);
    if (!hit) return;
    clear();
    pressed.current = { el: hit.el, x: e.clientX, y: e.clientY };
    hit.el.classList.add('fav-pressing');
    timer.current = window.setTimeout(() => { clear(); fire(hit.el, hit.eq); }, HOLD_MS);
  };
  const move = (e: RPointerEvent) => {
    const p = pressed.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) clear(); // scrolling, not pressing
  };

  return (
    <Tag className={`eq-zone ${className ?? ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={clear}
      onPointerCancel={clear} onPointerLeave={clear}
      onClickCapture={(e) => { // the click that ends a long-press must not toggle what's underneath
        if (Date.now() - firedAt.current < 900 && !(e.target as Element).closest?.('.eq-menu-in')) { e.preventDefault(); e.stopPropagation(); }
      }}
      onContextMenu={(e) => {
        const hit = equationAt(e.target);
        if (!hit) return;
        e.preventDefault();
        clear();
        fire(hit.el, hit.eq);
      }}>
      {children}
      {picked && createPortal(<EquationMenu eq={picked.eq} rect={picked.rect} host={picked.host}
        meta={typeof meta === 'function' ? meta() : meta} onClose={() => setPicked(null)} />, picked.host)}
    </Tag>
  );
}

let favCache: Promise<FavoriteEquation[]> | null = null;
/** Saved equations, shared by every menu (invalidated on save/remove). */
export const savedEquations = () => (favCache ??= ExamAPI.favorites().catch(() => { favCache = null; return []; }));
export const resetSavedEquations = () => { favCache = null; };
/** After a save/remove: refetch, and tell open lists. */
export const forgetSavedEquations = () => { favCache = null; window.dispatchEvent(new Event('favoriteschange')); };

const copy = (text: string, what: string) =>
  navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied`), () => toast.error('Could not copy'));

/** The equation lifted above a blurred page, with Save / Copy LaTeX / Copy for Markdown. */
function EquationMenu({ eq, rect, host, meta, onClose }: { eq: PickedEquation; rect: DOMRect; host: HTMLElement; meta: EquationSource; onClose: () => void }) {
  const [saved, setSaved] = useState<FavoriteEquation | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const html = useMemo(() => katex.renderToString(eq.latex, { displayMode: true, throwOnError: false, strict: false }), [eq.latex]);
  useEffect(() => {
    let live = true;
    savedEquations().then((list) => live && setSaved(list.find((f) => f.latex.trim() === eq.latex.trim()) ?? null));
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { live = false; window.removeEventListener('keydown', key); };
  }, [eq.latex, onClose]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (saved) {
        await ExamAPI.deleteFavorite(saved.id);
        setSaved(null);
        toast.success('Removed from saved equations');
      } else {
        const f = await ExamAPI.addFavorite({ ...meta, latex: eq.latex, display: eq.display });
        setSaved(f);
        toast.success('Equation saved');
      }
      forgetSavedEquations();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the equation');
    } finally {
      setBusy(false);
    }
  };

  // Keep the lifted copy where the equation was, but on screen and above the menu.
  // A transformed host (the drawer) is the containing block of `fixed`: measure from its top then.
  const box = host !== document.body && getComputedStyle(host).transform !== 'none' ? host.getBoundingClientRect() : null;
  const height = box ? box.height : window.innerHeight;
  const top = Math.min(Math.max(12, rect.top - (box?.top ?? 0) - 8), height - 260);
  const items: { icon: ReactNode; label: string; on: () => void; disabled?: boolean }[] = [
    { icon: saved ? <Check className="h-4 w-4 text-primary" /> : <Star className="h-4 w-4" />,
      label: saved === undefined ? 'Checking…' : saved ? 'Saved · tap to remove' : 'Save equation', on: toggle, disabled: busy || saved === undefined },
    { icon: <Copy className="h-4 w-4" />, label: 'Copy LaTeX', on: () => { copy(eq.latex, 'LaTeX'); onClose(); } },
    { icon: <Copy className="h-4 w-4" />, label: 'Copy for Markdown ($…$)', on: () => { copy(eq.display ? `$$${eq.latex}$$` : `$${eq.latex}$`, 'Markdown'); onClose(); } },
  ];
  return (
    <div className="fixed inset-0 z-[100] eq-menu-in" role="dialog" aria-label="Equation" onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full cursor-default bg-black/45 backdrop-blur-md" onClick={onClose} />
      <div className="absolute left-1/2 w-[min(92vw,34rem)] -translate-x-1/2 space-y-2" style={{ top }}>
        <div className="eq-lift max-h-48 overflow-auto rounded-2xl border border-primary/40 bg-card px-4 py-3 text-card-foreground shadow-2xl ring-4 ring-primary/15"
          dangerouslySetInnerHTML={{ __html: html }} />
        <div className="overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl">
          {items.map((it) => (
            <button key={it.label} type="button" disabled={it.disabled} onClick={it.on}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-secondary disabled:opacity-60 [&+&]:border-t [&+&]:border-border">
              {it.icon}{it.label}
            </button>
          ))}
          <button type="button" onClick={onClose} className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left text-sm text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** Scroll to the rendered equation `latex` (inside `scope`, or anywhere) and flash it. Waits up to
 *  `timeoutMs` for it to appear (content loads asynchronously). Falls back to flashing `scope`. */
export function focusEquation(latex: string, scope?: string, timeoutMs = 5000): void {
  const want = latex.replace(/\s+/g, '');
  const started = Date.now();
  const tick = () => {
    const root: ParentNode = (scope ? document.querySelector(scope) : null) ?? document;
    const hit = [...root.querySelectorAll('annotation[encoding="application/x-tex"]')]
      .find((a) => (a.textContent ?? '').replace(/\s+/g, '') === want);
    const el = (hit?.closest('.katex-display') ?? hit?.closest('.katex')) as HTMLElement | null;
    const target = el ?? (Date.now() - started > timeoutMs && scope ? document.querySelector(scope) as HTMLElement | null : null);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('eq-highlight');
      void target.offsetWidth; // restart the animation
      target.classList.add('eq-highlight');
      window.setTimeout(() => target.classList.remove('eq-highlight'), 3200);
      return;
    }
    if (Date.now() - started <= timeoutMs) window.setTimeout(tick, 150);
  };
  window.setTimeout(tick, 120);
}
