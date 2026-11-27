import { useEffect, useState } from 'react';
import { Download, Newspaper, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import markUrl from '../../assets/brand/mark.svg';
import type { ExamResult, UserAnswer } from './types';

/** The same card the Android app shares (lib/features/exams/result_card.dart): 4:5, laid out at 360×450
 *  and drawn at 3× (1080×1350 px), always in the dark logo colours whatever the theme. */
const W = 360, H = 450, SCALE = 3;
const C = {
  navy: '#101020', green: '#39F56B', lime: '#B7FF39', teal: '#00C98B', lavender: '#A8A9C7', red: '#FF5C7A',
};
const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const fmt = (n: number) => String(Number(n.toFixed(2)));
const attempted = (a?: UserAnswer) =>
  !!a && (a.selectedOptionLabel != null || (a.selectedOptionLabels?.length ?? 0) > 0 || (a.enteredAnswer ?? '') !== '');

interface ResultSummary {
  r: ExamResult;
  maxScore: number;
  skipped: number;
  wrong: number;
  pct: number; // 0..1
  percent: number;
  bestTopics: [string, number][];
  caption: string;
}

function summarize(r: ExamResult, maxScore: number): ResultSummary {
  const byId = new Map(r.answers.map((a) => [a.questionId, a]));
  const total = r.originalQuestions.length;
  const skipped = r.originalQuestions.filter((q) => !attempted(byId.get(q.id))).length;
  const pct = maxScore > 0 ? Math.min(1, Math.max(0, r.score / maxScore)) : r.accuracy / 100;
  const percent = Math.round(pct * 100);
  const bestTopics = Object.entries(r.accuracyPerTopic).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  // "7/10 correct" only adds information when marks aren't one per question
  const correct = fmt(r.score) === String(r.correctAnswers) && fmt(maxScore) === String(total) ? '' : `, ${r.correctAnswers}/${total} correct`;
  return {
    r, maxScore, skipped, wrong: total - r.correctAnswers - skipped, pct, percent, bestTopics,
    caption: `Scored ${fmt(r.score)}/${fmt(maxScore)} (${percent}%) on ${r.examName}${correct}. #outstagram #practice`,
  };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Text cut with "…" to fit `max` px. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

/** Up to two lines, the second one ellipsized. */
function wrap2(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width > max && line) return [line, fit(ctx, words.slice(i).join(' '), max)];
    line = next;
  }
  return [fit(ctx, line, max)];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawResultCard(s: ResultSummary): Promise<HTMLCanvasElement> {
  await document.fonts?.ready.catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  const r = s.r;

  // background + glow
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#181A38'); bg.addColorStop(0.5, C.navy); bg.addColorStop(1, '#0A0A16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W + 40, 40, 0, W + 40, 40, 120);
  glow.addColorStop(0, 'rgba(57,245,107,0.22)'); glow.addColorStop(1, 'rgba(57,245,107,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(W - 120, 0, 120, 160);

  const L = 24, R = W - 24;
  // brand
  const mark = await loadImage(markUrl);
  if (mark) ctx.drawImage(mark, L, 22, 20, 20);
  ctx.textBaseline = 'middle';
  ctx.font = `800 15px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('Outsta', L + 26, 32);
  ctx.fillStyle = C.green;
  ctx.fillText('gram', L + 26 + ctx.measureText('Outsta').width, 32);

  const dim = (t: string, x: number, y: number) => {
    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = C.lavender;
    ctx.letterSpacing = '1.4px';
    ctx.fillText(t, x, y);
    ctx.letterSpacing = '0px';
  };
  ctx.textBaseline = 'alphabetic';
  dim('EXAM RESULT', L, 78);
  ctx.font = `700 19px ${FONT}`;
  ctx.fillStyle = '#fff';
  wrap2(ctx, r.examName, R - L).forEach((ln, i) => ctx.fillText(ln, L, 102 + i * 23));

  // ring + score
  const ringY = 200, rad = 43.5;
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(L + 48, ringY, rad, 0, Math.PI * 2); ctx.stroke();
  if (s.pct > 0) {
    const start = -Math.PI / 2;
    const sweep = ctx.createConicGradient ? ctx.createConicGradient(start, L + 48, ringY) : null;
    if (sweep) {
      sweep.addColorStop(0, C.lime); sweep.addColorStop(0.33, C.green); sweep.addColorStop(0.66, C.teal); sweep.addColorStop(1, C.lime);
    }
    ctx.strokeStyle = sweep ?? C.green;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(L + 48, ringY, rad, start, start + Math.PI * 2 * s.pct); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText(`${s.percent}%`, L + 48, ringY + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const sx = L + 96 + 20;
  dim('SCORE', sx, ringY - 22);
  const score = fmt(r.score), of = ` / ${fmt(s.maxScore)}`;
  let big = 44;
  ctx.font = `900 ${big}px ${FONT}`;
  const room = R - sx;
  const widthAt = () => { ctx.font = `900 ${big}px ${FONT}`; const a = ctx.measureText(score).width; ctx.font = `400 ${big * 18 / 44}px ${FONT}`; return a + ctx.measureText(of).width; };
  while (big > 20 && widthAt() > room) big -= 2;
  ctx.font = `900 ${big}px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText(score, sx, ringY + 24);
  const sw = ctx.measureText(score).width;
  ctx.font = `400 ${big * 18 / 44}px ${FONT}`;
  ctx.fillStyle = C.lavender;
  ctx.fillText(of, sx + sw, ringY + 24);

  // pills
  const pills: [string, string, string][] = [[String(r.correctAnswers), 'correct', C.green], [String(s.wrong), 'wrong', C.red], [String(s.skipped), 'skipped', C.lavender]];
  const pw = (R - L - 16) / 3, py = 262;
  pills.forEach(([v, label, col], i) => {
    const x = L + i * (pw + 8);
    roundRect(ctx, x, py, pw, 48, 12);
    ctx.globalAlpha = 0.12; ctx.fillStyle = col; ctx.fill();
    ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = `800 18px ${FONT}`; ctx.fillStyle = col; ctx.fillText(v, x + pw / 2, py + 24);
    ctx.font = `400 10.5px ${FONT}`; ctx.fillStyle = C.lavender; ctx.fillText(label, x + pw / 2, py + 39);
    ctx.textAlign = 'left';
  });

  // strongest topics
  if (s.bestTopics.length) {
    dim('STRONGEST TOPICS', L, 334);
    s.bestTopics.forEach(([t, v], i) => {
      const y = 354 + i * 18;
      const pct = `${Math.round(v * 100)}%`;
      ctx.font = `700 13px ${FONT}`;
      const pw2 = ctx.measureText(pct).width;
      ctx.fillStyle = C.green; ctx.textAlign = 'right'; ctx.fillText(pct, R, y); ctx.textAlign = 'left';
      ctx.font = `400 13px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(fit(ctx, t, R - L - pw2 - 12), L, y);
    });
  }

  // footer
  ctx.font = `400 11px ${FONT}`;
  ctx.fillStyle = C.lavender;
  ctx.fillText(new Date(r.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), L, H - 20);
  ctx.textAlign = 'right';
  ctx.font = `400 9.5px ${FONT}`;
  ctx.letterSpacing = '2px';
  ctx.fillText('STUDY SMARTER WITH AI', R + 2, H - 20);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  return canvas;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not render the card'))), type, q));

/** Preview with "Share image" (system share, or download where the browser can't share files),
 *  "Download" and "Post to your feed" (opens the composer prefilled, like the app). */
export function ResultCardDialog({ open, onOpenChange, result, maxScore, onPost }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  result: ExamResult;
  maxScore: number;
  onPost?: (file: File, caption: string) => void;
}) {
  const [png, setPng] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const s = summarize(result, maxScore);

  useEffect(() => {
    if (!open) return;
    let live = true, made: string | null = null;
    drawResultCard(summarize(result, maxScore))
      .then((c) => toBlob(c, 'image/png'))
      .then((b) => {
        if (!live) return;
        const f = new File([b], `outstagram-result-${result.id}.png`, { type: 'image/png' });
        made = URL.createObjectURL(f);
        setPng(f);
        setUrl(made);
      })
      .catch((e) => toast.error(String(e?.message ?? e)));
    return () => { live = false; if (made) URL.revokeObjectURL(made); setPng(null); setUrl(null); };
  }, [open, result, maxScore]);

  const download = () => {
    if (!url || !png) return;
    const a = document.createElement('a');
    a.href = url; a.download = png.name; a.click();
  };
  const share = async () => {
    if (!png) return;
    const data = { files: [png], text: `${s.caption}\n${window.location.origin}/` };
    if (navigator.canShare?.(data)) {
      try { await navigator.share(data); } catch (e) { if ((e as Error).name !== 'AbortError') download(); }
    } else {
      download();
      toast.success('Card downloaded. Attach it anywhere you like.');
    }
  };
  const post = async () => {
    if (!png || !onPost) return;
    // JPEG keeps it under the Free plan's 200 kB photo limit; the dark gradient compresses well.
    const c = await drawResultCard(s);
    const jpg = await toBlob(c, 'image/jpeg', 0.9);
    onPost(new File([jpg], `outstagram-result-${result.id}.jpg`, { type: 'image/jpeg' }), s.caption);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your result</DialogTitle>
          <DialogDescription>A card for your feed, Instagram or WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[320px] aspect-[4/5] overflow-hidden rounded-2xl bg-[#101020]">
          {url ? <img src={url} alt={`Result card: ${s.caption}`} className="h-full w-full" />
            : <div className="h-full w-full animate-pulse bg-white/5" />}
        </div>
        <div className="grid gap-2">
          <Button onClick={share} disabled={!png}><Share2 className="w-4 h-4" /> Share image</Button>
          <div className={`grid gap-2 ${onPost ? 'grid-cols-2' : ''}`}>
            {onPost && <Button variant="outline" onClick={post} disabled={!png}><Newspaper className="w-4 h-4" /> Post to feed</Button>}
            <Button variant="outline" onClick={download} disabled={!png}><Download className="w-4 h-4" /> Download</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
