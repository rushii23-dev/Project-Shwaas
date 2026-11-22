import { LogoMark } from "../components/Brand";
import { Link } from "../router";
import { useApp } from "../state/AppState";

export function SiteFooter() {
  const { t } = useApp();
  const links = [
    { to: "/plan", label: t("nav.plan") },
    { to: "/world", label: t("nav.world") },
    { to: "/smog", label: t("nav.smog") },
    { to: "/about", label: t("nav.about") },
  ] as const;

  return (
    <footer className="on-night bg-night text-mist">
      <div className="mx-auto grid max-w-[90rem] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr] md:py-20">
        <div>
          <p className="flex items-center gap-3 text-white">
            <LogoMark size={40} className="text-mist" />
            <span className="font-display text-4xl tracking-tight">{t("brand")}</span>
          </p>
          <p className="mt-5 max-w-sm font-display text-xl leading-snug text-white/90">{t("site.tagline")}</p>
        </div>
        <div className="grid content-start gap-8 sm:grid-cols-2">
          <nav aria-label={t("site.sources")}>
            <ul className="grid gap-2.5">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="grid content-start gap-3 text-sm text-mist-2">
            <p>{t("site.notAdvice")}</p>
            <p>{t("site.photos")}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[90rem] px-5 py-6 text-sm text-mist-2 sm:px-8">© {new Date().getFullYear()} Shwaas</p>
      </div>
    </footer>
  );
}
