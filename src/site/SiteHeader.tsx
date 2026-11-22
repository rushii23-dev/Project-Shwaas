import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "../components/Brand";
import { LangToggle } from "../components/LangToggle";
import type { MessageKey } from "../lib/i18n";
import { Link, useRouter, type Route } from "../router";
import { useApp } from "../state/AppState";

interface NavItem {
  to: Route;
  key: MessageKey;
}

const NAV: readonly NavItem[] = [
  { to: "/world", key: "nav.world" },
  { to: "/smog", key: "nav.smog" },
  { to: "/about", key: "nav.about" },
];

/** The mobile menu leads with the planner, which the desktop bar shows as a button. */
const MOBILE_NAV: readonly NavItem[] = [{ to: "/plan", key: "nav.plan" }, ...NAV];

/**
 * Fixed header. Over a photo hero it starts transparent and turns into a
 * frosted night bar once the reader scrolls; on the planner it is solid.
 */
export function SiteHeader({ overHero }: { overHero: boolean }) {
  const { t } = useApp();
  const { route } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = !overHero || scrolled;
  const close = () => setOpen(false);

  return (
    <header
      className={`on-night fixed inset-x-0 top-0 z-50 text-white transition-[background-color,border-color,backdrop-filter] duration-500 ${
        open
          ? "border-b border-white/10 bg-night"
          : solid
            ? "border-b border-white/10 bg-night/88 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[90rem] items-center gap-6 px-5 sm:px-8">
        <Link to="/" aria-label={t("nav.home")} className="text-mist" onClick={close}>
          <span className="text-white">
            <Brand size={30} />
          </span>
        </Link>

        <nav aria-label={t("nav.label")} className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-3.5 py-2 text-[0.95rem] text-mist transition-colors hover:text-white aria-[current=page]:text-white aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <span className="hidden sm:inline-flex [&_.btn]:border-white/25 [&_.btn]:bg-transparent [&_.btn]:text-white">
            <LangToggle />
          </span>
          {route !== "/plan" && (
            <Link to="/plan" className="btn btn-primary hidden px-5 sm:inline-flex">
              {t("nav.plan")}
            </Link>
          )}
          <button
            type="button"
            className="btn btn-ghost-night size-11 p-0 md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={t("nav.menu")}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </div>

      <div id={menuId} hidden={!open} className="border-t border-white/10 px-5 pb-6 pt-2 md:hidden">
        <nav aria-label={t("nav.label")}>
          <ul className="grid">
            {MOBILE_NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  onClick={close}
                  className="block border-b border-white/10 py-4 font-display text-2xl text-white aria-[current=page]:text-accent"
                >
                  {t(n.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-5 [&_.btn]:border-white/25 [&_.btn]:bg-transparent [&_.btn]:text-white">
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
