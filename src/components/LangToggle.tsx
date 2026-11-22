import { useApp } from "../state/AppState";

/** Switch between English and Hindi; labelled in the language it switches to. */
export function LangToggle() {
  const { lang, setLang } = useApp();
  const next = lang === "en" ? "hi" : "en";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className="btn btn-quiet min-w-11 px-3"
      lang={next}
      // The system's Devanagari font, so English pages never download a Hindi webfont for one word.
      style={next === "hi" ? { fontFamily: "system-ui, sans-serif" } : undefined}
      aria-label={next === "hi" ? "हिन्दी में देखें" : "View in English"}
    >
      {next === "hi" ? "हिन्दी" : "English"}
    </button>
  );
}
