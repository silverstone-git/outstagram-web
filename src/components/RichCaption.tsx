import { Fragment, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { EquationZone } from '../features/exams/EquationPicker';

type Part = { text: string } | { tex: string; display: boolean };

/** Splits a caption into text and maths: $$…$$ and \[…\] (display), \(…\) and $…$ (inline).
 *  A single $ only opens maths when followed by a non-space and closes before a non-digit, so
 *  "₹5 or $5 and $10" stays text (Pandoc's rule). */
export function splitMath(src: string): Part[] {
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?=\S)((?:\\\$|[^$\n])+?)(?<=\S)\$(?!\d)/g;
  const out: Part[] = [];
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    const display = m[1] != null || m[2] != null;
    out.push({ tex: (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim(), display });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

function Tex({ tex, display }: { tex: string; display: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false, output: 'htmlAndMathml' }),
    [tex, display]);
  return display
    ? <span className="my-1 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
    : <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A post caption with LaTeX rendered. Long-press / right-click an equation to save or copy it. */
export function RichCaption({ text, postId, className }: { text?: string | null; postId?: string; className?: string }) {
  const parts = useMemo(() => splitMath(text ?? ''), [text]);
  if (!parts.some((p) => 'tex' in p)) return <span className={`whitespace-pre-wrap break-words ${className ?? ''}`}>{text}</span>;
  return (
    <EquationZone as="span" className={`whitespace-pre-wrap break-words ${className ?? ''}`}
      meta={{ source: 'post', post_id: postId ?? null, context: (text ?? '').slice(0, 300), skill: null, attempt_id: null, question_id: null, message_id: null }}>
      {parts.map((p, i) => <Fragment key={i}>{'tex' in p ? <Tex tex={p.tex} display={p.display} /> : p.text}</Fragment>)}
    </EquationZone>
  );
}
