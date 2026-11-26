import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { EquationZone, type EquationSource } from './EquationPicker';

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

/** Tutor answer: GitHub-flavoured Markdown + KaTeX. With `equations`, long-press (touch) or right-click
 *  (mouse) an equation to open the equation menu (save, copy LaTeX). */
export function TutorMarkdown({ text, equations }: { text: string; equations?: EquationSource | (() => EquationSource) }) {
  const md = (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: 'htmlAndMathml' }]]}
      components={{ a: (props) => <a href={props.href} target="_blank" rel="noreferrer noopener">{props.children}</a> }}>
      {normalizeMath(text)}
    </ReactMarkdown>
  );
  return equations ? <EquationZone meta={equations} className="md">{md}</EquationZone> : <div className="md">{md}</div>;
}
