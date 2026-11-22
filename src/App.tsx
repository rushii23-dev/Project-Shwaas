import { Suspense, useEffect, useRef } from "react";
import { PAGE_TITLES, PAGES } from "./pages/registry";
import { Link, useRouter } from "./router";
import { ErrorBoundary } from "./site/ErrorBoundary";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader } from "./site/SiteHeader";
import { useApp } from "./state/AppState";

/** Poll briefly for the new page's heading: lazy pages render it a moment after navigation. */
function focusHeadingSoon(): () => void {
  let tries = 0;
  const id = window.setInterval(() => {
    const h1 = document.querySelector<HTMLElement>("main h1");
    tries += 1;
    if (!h1 && tries < 20) return;
    window.clearInterval(id);
    if (!h1) return;
    if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
    h1.focus({ preventScroll: true });
  }, 50);
  return () => {
    window.clearInterval(id);
  };
}

export function App() {
  const { route } = useRouter();
  const { t, place, profile } = useApp();
  const Page = route ? PAGES[route] : null;
  const first = useRef(true);

  useEffect(() => {
    document.title = t(route ? PAGE_TITLES[route] : "notfound.title");
  }, [route, t]);

  // On client-side navigation: start at the top and move focus to the new page's
  // heading, so screen-reader users hear that the page changed.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    return focusHeadingSoon();
  }, [route]);

  // Over a photo the header starts transparent; on the live dashboard it's solid.
  const onDashboard = route === "/plan" && place !== null && profile !== null;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t("skip")}
      </a>
      <SiteHeader overHero={!onDashboard} />
      <main id="main" tabIndex={-1} className="outline-none">
        <ErrorBoundary key={route ?? "404"} fallback={(retry) => <PageError onRetry={retry} />}>
          <Suspense fallback={<PageFallback />}>{Page ? <Page /> : <NotFound />}</Suspense>
        </ErrorBoundary>
      </main>
      <SiteFooter />
    </>
  );
}

function PageFallback() {
  const { t } = useApp();
  return (
    <div className="grid min-h-[100svh] place-items-center bg-night text-mist" role="status">
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-accent" />
        {t("site.loading")}
      </span>
    </div>
  );
}

function PageError({ onRetry }: { onRetry: () => void }) {
  const { t } = useApp();
  return (
    <section role="alert" className="on-night grid min-h-[80svh] place-items-center bg-night px-5 pt-16 text-white">
      <div className="max-w-xl text-center">
        <h1 className="display text-[clamp(2.2rem,5vw,3.6rem)]">{t("error.page.title")}</h1>
        <p className="lede mt-5 text-mist">{t("error.page.body")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary px-6" onClick={onRetry}>
            {t("retry")}
          </button>
          <button
            type="button"
            className="btn btn-ghost-night px-6"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t("error.page.reload")}
          </button>
        </div>
      </div>
    </section>
  );
}

function NotFound() {
  const { t } = useApp();
  return (
    <section className="on-night grid min-h-[80svh] place-items-center bg-night px-5 pt-16 text-white">
      <div className="max-w-xl text-center">
        <h1 className="display text-[clamp(2.4rem,6vw,4.4rem)]">{t("notfound.title")}</h1>
        <p className="lede mt-5 text-mist">{t("notfound.body")}</p>
        <Link to="/" className="btn btn-primary mt-8 px-6">
          {t("notfound.cta")}
        </Link>
      </div>
    </section>
  );
}
