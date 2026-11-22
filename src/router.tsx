import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { prefetch } from "./pages/registry";

/**
 * A few lines of History-API routing: the site has five pages and no nested
 * routes, so a library would be dead weight. Static hosts rewrite every path
 * to index.html (see vercel.json and public/_redirects).
 */
export const ROUTES = ["/", "/plan", "/world", "/smog", "/about"] as const;
export type Route = (typeof ROUTES)[number];

export function toRoute(pathname: string): Route | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return (ROUTES as readonly string[]).includes(clean) ? (clean as Route) : null;
}

interface RouterState {
  /** null when the URL matches no page (rendered as "not found"). */
  route: Route | null;
  navigate: (to: Route, opts?: { replace?: boolean; hash?: string }) => void;
}

const Ctx = createContext<RouterState | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route | null>(() => toRoute(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(toRoute(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback<RouterState["navigate"]>((to, opts = {}) => {
    const url = to + (opts.hash ? `#${opts.hash}` : "");
    if (opts.replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setRoute(to);
  }, []);

  const value = useMemo(() => ({ route, navigate }), [route, navigate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRouter(): RouterState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRouter must be used inside <RouterProvider>");
  return v;
}

/** True for clicks the browser should handle itself (new tab, new window, download). */
export const isModifiedClick = (e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) =>
  e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * An internal link: a real <a href> (so open-in-new-tab works) with client-side
 * navigation, and the target page's code prefetched on hover, focus or touch.
 */
export function Link({
  to,
  children,
  ...rest
}: { to: Route; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const { route, navigate } = useRouter();
  const warm = () => {
    prefetch(to);
  };
  return (
    <a
      href={to}
      aria-current={route === to ? "page" : undefined}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        if (e.defaultPrevented || isModifiedClick(e)) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
