import { useId, useState } from "react";
import { getApiKey, hasBundledKey, hasUserKey, setUserKey } from "../lib/ai/gemini";
import { clearMemoryCache } from "../lib/api/http";
import { clearAll } from "../lib/storage";
import { useApp, type ThemePref } from "../state/AppState";
import { Dialog } from "./Dialog";

const THEMES: readonly ThemePref[] = ["system", "light", "dark"];

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, setLang, theme, setTheme, reset } = useApp();
  const [key, setKey] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [, force] = useState(0);
  const keyId = useId();
  const helpId = useId();

  const keyStatus = hasUserKey()
    ? t("settings.keyActive.user")
    : getApiKey() && hasBundledKey()
      ? t("settings.keyActive.bundled")
      : t("settings.keyActive.none");

  return (
    <Dialog open={open} onClose={onClose} title={t("settings.title")}>
      <div className="grid gap-7 p-5">
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 font-semibold">{t("settings.lang")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["en", "hi"] as const).map((l) => (
              <label key={l} className="chip" lang={l}>
                <input type="radio" name="lang" checked={lang === l} onChange={() => setLang(l)} />
                {l === "en" ? "English" : "हिन्दी"}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 font-semibold">{t("settings.theme")}</legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((v) => (
              <label key={v} className="chip">
                <input type="radio" name="theme" checked={theme === v} onChange={() => setTheme(v)} />
                {t(`theme.${v}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setUserKey(key);
            setKey("");
            setNote(t("settings.keySaved"));
          }}
        >
          <label htmlFor={keyId} className="font-semibold">
            {t("settings.key")}
          </label>
          <p id={helpId} className="text-sm text-ink-2">
            {t("settings.keyHelp")} {keyStatus}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              id={keyId}
              aria-describedby={helpId}
              className="field min-w-0 flex-1"
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={key.trim().length < 20}>
              {t("settings.keySave")}
            </button>
            {hasUserKey() && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setUserKey(null);
                  force((n) => n + 1);
                }}
              >
                {t("settings.keyRemove")}
              </button>
            )}
          </div>
        </form>

        <div className="border-t border-line pt-5">
          <button
            type="button"
            className="btn btn-quiet text-warn"
            onClick={() => {
              clearAll();
              clearMemoryCache();
              setNote(t("settings.cleared"));
              reset();
            }}
          >
            {t("settings.clear")}
          </button>
        </div>

        <p role="status" className="min-h-6 text-ok">
          {note}
        </p>
      </div>
    </Dialog>
  );
}
