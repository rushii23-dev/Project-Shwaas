import type { ReactNode } from "react";
import { useApp } from "../state/AppState";

/**
 * A link to another site. It opens in a new tab without giving that page a
 * handle on this one (noopener) or our URL (noreferrer), and tells screen
 * reader users up front that the tab will change.
 */
export function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { t } = useApp();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> {t("newTab")}</span>
    </a>
  );
}
