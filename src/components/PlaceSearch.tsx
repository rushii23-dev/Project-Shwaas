import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { searchPlaces } from "../lib/api/geocode";
import type { Place } from "../lib/types";
import { useApp } from "../state/AppState";

/** Search form + result buttons. Results are announced politely to screen readers. */
export function PlaceSearch({ onPick, focusOnMount = false }: { onPick: (p: Place) => void; focusOnMount?: boolean }) {
  const { t, lang } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // In the "change place" dialog the user's next step is typing, so start there.
  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true);
    setFailed(false);
    try {
      const r = await searchPlaces(q, lang, c.signal);
      if (!c.signal.aborted) setResults(r);
    } catch {
      if (!c.signal.aborted) setFailed(true);
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t("search.label")}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="field flex-1"
          type="search"
          inputMode="search"
          autoComplete="address-level2"
          maxLength={80}
          placeholder={t("search.placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Search aria-hidden="true" size={18} />
          {t("search.button")}
        </button>
      </form>

      <div aria-live="polite" className="mt-3">
        {failed && <p className="text-warn">{t("error.air")}</p>}
        {results && results.length === 0 && <p className="text-ink-2">{t("search.none")}</p>}
        {results && results.length > 0 && (
          <>
            <p className="sr-only">{t("search.results", { n: results.length })}</p>
            <ul className="grid gap-1.5">
              {results.map((r) => (
                <li key={`${r.lat},${r.lon}`}>
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-paper-2 px-4 py-3 text-left hover:border-line"
                  >
                    <MapPin aria-hidden="true" size={18} className="shrink-0 text-iris" />
                    <span>
                      <span className="block font-semibold">{r.name}</span>
                      {r.region && <span className="block text-sm text-ink-2">{r.region}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
