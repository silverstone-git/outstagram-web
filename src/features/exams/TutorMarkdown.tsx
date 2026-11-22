import { useRef, type PointerEvent as RPointerEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/** Models emit \( \) / \[ \] and sometimes bare \begin{..}; remark-math wants $ / $$ on their own lines. */
export function normalizeMath(src: string): string {
  let t = src
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);
  const marks = t.match(/\$\$/g)?.length ?? 0;
  if (marks % 2 === 1) { // dangling $$ (or mid-stream): drop the last one
    const i = t.lastIndexOf('$$');
    t = t.slice(0, i) + t.slice(i + 2);
  }
  return t
    .split(/(\$\$[\s\S]*?\$\$)/g)
    .map((part, i) => (i % 2 === 1
      ? `\n\n$$\n${part.slice(2, -2).trim()}\n$$\n\n`
      : part.replace(/\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g, (m) => `\n\n$$\n${m}\n$$\n\n`)))
    .join('');
}

export interface PickedEquation { latex: string; display: boolean }

/** LaTeX source of a rendered KaTeX node (KaTeX keeps it in a MathML annotation). */
function equationAt(target: EventTarget | null): { el: HTMLElement; eq: PickedEquation } | null {
  const node = target instanceof Element ? target : null;
  const display = node?.closest('.katex-display') as HTMLElement | null;
  const inline = node?.closest('.katex') as HTMLElement | null;
  const el = display ?? inline;
  if (!el) return null;
  const tex = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
  return tex ? { el, eq: { latex: tex, display: !!display } } : null;
}

const HOLD_MS = 450;

/** Tutor answer: GitHub-flavoured Markdown + KaTeX. Long-press (touch) or right-click (mouse) an
 *  equation to call onPickEquation, e.g. to save it as a favourite. */
export function TutorMarkdown({ text, onPickEquation }: { text: string; onPickEquation?: (eq: PickedEquation) => void }) {
  const timer = useRef<number | null>(null);
  const pressed = useRef<{ el: HTMLElement; x: number; y: number } | null>(null);
  const firedAt = useRef(0);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    pressed.current?.el.classList.remove('fav-pressing');
    pressed.current = null;
  };
  const fire = (el: HTMLElement, eq: PickedEquation) => {
    if (Date.now() - firedAt.current < 800) return; // long-press also triggers contextmenu on Android
    firedAt.current = Date.now();
    el.classList.add('fav-flash');
    window.setTimeout(() => el.classList.remove('fav-flash'), 600);
    navigator.vibrate?.(15);
    onPickEquation?.(eq);
  };

  const down = (e: RPointerEvent) => {
    if (!onPickEquation || e.button > 0) return;
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
    <div className="md" onPointerDown={down} onPointerMove={move} onPointerUp={clear} onPointerCancel={clear} onPointerLeave={clear}
      onContextMenu={(e) => {
        if (!onPickEquation) return;
        const hit = equationAt(e.target);
        if (!hit) return;
        e.preventDefault();
        clear();
        fire(hit.el, hit.eq);
      }}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: 'htmlAndMathml' }]]}
        components={{ a: (props) => <a href={props.href} target="_blank" rel="noreferrer noopener">{props.children}</a> }}>
        {normalizeMath(text)}
      </ReactMarkdown>
    </div>
  );
}
