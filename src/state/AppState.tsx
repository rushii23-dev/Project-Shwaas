import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translator, type Translate } from "../lib/i18n";
import { parseProfile } from "../lib/profile";
import { readJson, writeJson } from "../lib/storage";
import type { Lang, Place, Profile } from "../lib/types";

export type ThemePref = "system" | "light" | "dark";

interface AppState {
  lang: Lang;
  t: Translate;
  setLang: (l: Lang) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  place: Place | null;
  setPlace: (p: Place) => void;
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  /** Wipe in-memory state after the user deletes their data. */
  reset: () => void;
}

const Ctx = createContext<AppState | null>(null);

const KEYS = { lang: "shwaas:lang", theme: "shwaas:theme", place: "shwaas:place", profile: "shwaas:profile" } as const;

export function parsePlace(raw: unknown): Place | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = typeof r.name === "string" && r.name.trim() ? r.name.slice(0, 80) : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  const region = typeof r.region === "string" ? r.region.slice(0, 120) : undefined;
  return { lat, lon, name, ...(region ? { region } : {}) };
}

function initialLang(): Lang {
  const saved = readJson(KEYS.lang);
  if (saved === "en" || saved === "hi") return saved;
  return typeof navigator !== "undefined" && navigator.language.startsWith("hi") ? "hi" : "en";
}

function initialTheme(): ThemePref {
  const saved = readJson(KEYS.theme);
  return saved === "light" || saved === "dark" ? saved : "system";
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [theme, setThemeState] = useState<ThemePref>(initialTheme);
  const [place, setPlaceState] = useState<Place | null>(() => parsePlace(readJson(KEYS.place)));
  const [profile, setProfileState] = useState<Profile | null>(() => parseProfile(readJson(KEYS.profile)));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeJson(KEYS.lang, l);
  }, []);
  const setTheme = useCallback((v: ThemePref) => {
    setThemeState(v);
    writeJson(KEYS.theme, v);
  }, []);
  const setPlace = useCallback((p: Place) => {
    setPlaceState(p);
    writeJson(KEYS.place, p);
  }, []);
  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    writeJson(KEYS.profile, p);
  }, []);
  const reset = useCallback(() => {
    setPlaceState(null);
    setProfileState(null);
    setThemeState("system");
  }, []);

  const value = useMemo<AppState>(
    () => ({ lang, t: translator(lang), setLang, theme, setTheme, place, setPlace, profile, setProfile, reset }),
    [lang, setLang, theme, setTheme, place, setPlace, profile, setProfile, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppStateProvider>");
  return v;
}
