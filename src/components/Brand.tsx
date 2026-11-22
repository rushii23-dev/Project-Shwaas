import { useApp } from "../state/AppState";

/** Wordmark: three breath lines in an iris tile. */
export function Brand() {
  const { t } = useApp();
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg aria-hidden="true" width="30" height="30" viewBox="0 0 32 32" className="shrink-0">
        <rect width="32" height="32" rx="10" fill="var(--iris)" />
        <path d="M7 12.5h11a3.5 3.5 0 1 0-3.5-3.5M7 17.5h14.5a3.8 3.8 0 1 1-3.8 3.8M7 22.5h5" fill="none" stroke="var(--iris-ink)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-2xl font-semibold" style={{ fontStretch: "88%" }}>
        {t("brand")}
      </span>
    </span>
  );
}
