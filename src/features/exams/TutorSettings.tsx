import { useEffect, useState } from 'react';
import { KeyRound, Loader2, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { ExamAPI, type AIOptions, type ByokConfig, type ChatChoice, type Effort } from './examApi';
import { openPaywall } from '../billing/billing';

/** Tutor choices kept on this device (the BYOK key never leaves it except with your own prompts). */
export interface TutorPrefs {
  model: string | null;
  effort: Effort;
  useByok: boolean;
  byok: { provider: string; api_type: ByokConfig['api_type']; base_url: string; api_key: string; model: string };
}
const KEY = 'outstagram_tutor_prefs_v1';
const DEFAULTS: TutorPrefs = { model: null, effort: 'auto', useByok: false,
  byok: { provider: 'openai', api_type: 'openai', base_url: '', api_key: '', model: '' } };

export function loadPrefs(): TutorPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw ? { ...DEFAULTS, ...raw, byok: { ...DEFAULTS.byok, ...(raw.byok || {}) } } : DEFAULTS;
  } catch { return DEFAULTS; }
}
function savePrefs(p: TutorPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event('tutorprefs'));
}

export function useTutorPrefs(): [TutorPrefs, (p: TutorPrefs) => void] {
  const [p, setP] = useState(loadPrefs);
  useEffect(() => {
    const on = () => setP(loadPrefs());
    window.addEventListener('tutorprefs', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('tutorprefs', on); window.removeEventListener('storage', on); };
  }, []);
  return [p, savePrefs];
}

let optionsCache: Promise<AIOptions | null> | null = null;
export const loadOptions = (fresh = false) => {
  if (fresh) optionsCache = null;
  return (optionsCache ??= ExamAPI.options().catch(() => { optionsCache = null; return null; }));
};
if (typeof window !== 'undefined') window.addEventListener('planchange', () => { optionsCache = null; });

/** What to send with a prompt: nothing for free users or default settings. */
export function choiceFor(p: TutorPrefs, o: AIOptions | null): ChatChoice | undefined {
  if (!o?.allowed) return undefined;
  const effort = p.effort !== 'auto' ? p.effort : null;
  if (p.useByok && p.byok.api_key && p.byok.model) {
    const prov = o.byok.providers.find((x) => x.id === p.byok.provider);
    return { effort, byok: { api_type: p.byok.api_type, base_url: p.byok.base_url || prov?.base_url || null,
      api_key: p.byok.api_key, model: p.byok.model, label: prov?.label ?? null } };
  }
  const model = p.model && o.models.some((m) => m.id === p.model && m.available) ? p.model : null;
  return model || effort ? { model, effort } : undefined;
}

/** One line under the input: what will answer. */
export function choiceLabel(p: TutorPrefs, o: AIOptions | null): string | null {
  const c = choiceFor(p, o);
  if (!c) return null;
  const who = c.byok ? `Your key · ${c.byok.model}` : (o?.models.find((m) => m.id === c.model)?.label.split(' · ')[0] ?? 'Default model');
  return c.effort ? `${who} · ${c.effort} thinking` : who;
}

const EFFORT_TEXT: Record<Effort, string> = { auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High' };

export function TutorSettings({ options, onClose }: { options: AIOptions | null; onClose: () => void }) {
  const [p, setP] = useTutorPrefs();
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const set = (patch: Partial<TutorPrefs>) => setP({ ...p, ...patch });
  const setByok = (patch: Partial<TutorPrefs['byok']>) => setP({ ...p, byok: { ...p.byok, ...patch } });

  if (!options) return <div className="p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  const locked = !options.allowed;
  const provider = options.byok.providers.find((x) => x.id === p.byok.provider) ?? options.byok.providers[0];

  const check = async () => {
    setChecking(true);
    try {
      const list = await ExamAPI.byokModels({ api_type: p.byok.api_type, base_url: p.byok.base_url || provider?.base_url || null, api_key: p.byok.api_key });
      setModels(list);
      toast.success(`Key works · ${list.length} models`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The provider refused the key');
    } finally { setChecking(false); }
  };

  return (
    <div className="space-y-4 border-t border-border bg-card/60 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Tutor settings</p>
        <button type="button" aria-label="Close settings" onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
      </div>
      {locked && (
        <button type="button" onClick={() => openPaywall({ code: 'ai_options', message: options.upgrade?.message })}
          className="flex w-full items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-left text-xs">
          <Lock className="h-4 w-4 shrink-0 text-primary" />
          <span>Pick the model, the thinking level and use your own API key with <b>Pro</b> or <b>Contributor</b>. Paid answers also read more textbook passages.</span>
        </button>
      )}
      <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
        <div className={p.useByok ? 'opacity-50' : ''}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Model</p>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: '', label: 'Default', available: true, plan: 'pro' as const }, ...options.models].map((m) => {
              const on = (p.model ?? '') === m.id;
              const off = !m.available && !locked;
              return (
                <button key={m.id || 'default'} type="button" disabled={p.useByok}
                  onClick={() => (off ? openPaywall({ code: 'ai_model', message: `${m.label} comes with Contributor.` }) : set({ model: m.id || null }))}
                  className={`rounded-full border px-2.5 py-1 text-xs ${on ? 'border-primary bg-primary/15 text-primary' : 'border-border'} ${off ? 'opacity-60' : ''}`}>
                  {m.label}{off && <Lock className="ml-1 inline h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Thinking</p>
          <div className="inline-flex overflow-hidden rounded-lg border border-border">
            {options.efforts.map((e) => (
              <button key={e} type="button" onClick={() => set({ effort: e })}
                className={`px-3 py-1.5 text-xs ${p.effort === e ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{EFFORT_TEXT[e]}</button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">More thinking is slower but better on hard derivations. Models that can't think ignore it.</p>
        </div>
        <div className="space-y-2 rounded-xl border border-border p-3">
          <label className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium"><KeyRound className="h-4 w-4" />Use my own API key</span>
            <Switch checked={p.useByok} onCheckedChange={(v) => set({ useByok: v })} />
          </label>
          {p.useByok && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {options.byok.providers.map((x) => (
                  <button key={x.id} type="button" onClick={() => { setByok({ provider: x.id, api_type: x.api_type, base_url: x.base_url }); setModels([]); }}
                    className={`rounded-full border px-2.5 py-1 text-xs ${p.byok.provider === x.id ? 'border-primary bg-primary/15 text-primary' : 'border-border'}`}>{x.label}</button>
                ))}
              </div>
              {provider?.id === 'custom' && (
                <Input placeholder="https://api.example.com/v1" value={p.byok.base_url} onChange={(e) => setByok({ base_url: e.target.value })} />
              )}
              <div className="flex gap-2">
                <Input type="password" autoComplete="off" placeholder="API key" value={p.byok.api_key} onChange={(e) => setByok({ api_key: e.target.value.trim() })} />
                <Button type="button" variant="outline" disabled={checking || p.byok.api_key.length < 8} onClick={check}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                </Button>
              </div>
              <Input list="byok-models" placeholder={`Model (${provider?.models_hint ?? 'model id'})`} value={p.byok.model}
                onChange={(e) => setByok({ model: e.target.value.trim() })} />
              <datalist id="byok-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
              <p className="text-[11px] text-muted-foreground">{options.byok.note} Textbook search still runs on Outstagram. Up to {options.byok.per_hour} prompts an hour, not counted in your AI limit.</p>
            </div>
          )}
        </div>
        {!locked && <p className="text-[11px] text-muted-foreground">Your plan: answers read up to {options.context.passages} textbook passages and the last {options.context.history_turns} messages.</p>}
      </fieldset>
    </div>
  );
}
