import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { OutstagramAPI } from '../services/api';
import type { UserSearchResult } from '../services/api';
import { openProfile } from '../lib/nav';

/** Find people by username prefix or name (GET /users/search), 250 ms debounce; Escape clears. */
export function UserSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (!query) { setResults(null); setLoading(false); setError(false); return; }
    let live = true;
    setLoading(true);
    const t = window.setTimeout(() => {
      OutstagramAPI.searchUsers(query)
        .then((r) => { if (live) { setResults(r); setError(false); } })
        .catch(() => { if (live) setError(true); })
        .finally(() => { if (live) setLoading(false); });
    }, 250);
    return () => { live = false; window.clearTimeout(t); };
  }, [q]);

  // close the dropdown on a click outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const clear = () => { setQ(''); setResults(null); };
  const showList = open && q.trim().length > 0;

  return (
    <div ref={box} className="relative">
      <label className="flex h-10 items-center gap-2 rounded-full border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search" value={q} placeholder="Search people" aria-label="Search people"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { clear(); (e.target as HTMLInputElement).blur(); } }}
          autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={50}
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={clear} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {showList && (
        <div role="listbox" className="absolute left-0 right-0 top-12 z-20 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {error ? (
            <p className="p-3 text-center text-sm text-muted-foreground">Search isn't working right now.</p>
          ) : results === null || (loading && results.length === 0) ? (
            <p className="p-3 text-center text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-center text-sm text-muted-foreground">No one found</p>
          ) : (
            results.map((u) => (
              <button key={u.user_id} type="button" role="option" aria-selected={false}
                onClick={() => { setOpen(false); clear(); openProfile(u.username); }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary/60">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} />
                  <AvatarFallback>{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-card-foreground">@{u.username}</div>
                  {u.fullname && <div className="truncate text-xs text-muted-foreground">{u.fullname}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
