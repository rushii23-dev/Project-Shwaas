import { useRef } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { PHOTOS } from "../content/photos";
import { SRC, useText } from "../content/text";
import { useWorldAir } from "../hooks/useWorldAir";
import { bandFor } from "../lib/aqi";
import { fmtFixed } from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "../lib/motion";
import { Link } from "../router";
import { useApp } from "../state/AppState";
import { countUp } from "../site/animations";
import { Cite, Photo } from "../site/Photo";
import { splitWords } from "../site/splitWords";
import { useSmoothScroll } from "../site/useSmoothScroll";
import { CAUSES, copy, STATS, STEPS } from "./home/content";
import { ExploreCard } from "./home/ExploreCard";
import { StepPreview } from "./home/StepPreview";

/* ------------------------------------------------------------------ page */

export default function HomePage() {
  useSmoothScroll();
  const root = useRef<HTMLDivElement>(null);
  const { lang, t } = useApp();
  const tx = useText();
  const world = useWorldAir();
  const delhi = world.data?.find((c) => c.city.id === "delhi");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        // Hero: the one orchestrated load moment, then a slow photographic parallax.
        const heroTitle = root.current?.querySelector<HTMLElement>("[data-split]");
        const statement = root.current?.querySelector<HTMLElement>("[data-scrub-words]");
        const heroWords = heroTitle ? splitWords(heroTitle, { mask: true }) : null;
        const statementWords = statement ? splitWords(statement) : null;

        if (heroWords)
          gsap.from(heroWords.words, { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.035, delay: 0.15 });
        gsap.from("[data-hero-fade]", { opacity: 0, y: 24, duration: 1.2, ease: "expo.out", stagger: 0.12, delay: 0.55 });
        gsap.to("[data-hero-img]", {
          scale: 1.12,
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to("[data-hero-copy]", {
          yPercent: -18,
          opacity: 0.15,
          ease: "none",
          scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true },
        });

        // Statement: words brighten as you read down the page.
        if (statementWords) {
          gsap.fromTo(
            statementWords.words,
            { opacity: 0.4 },
            {
              opacity: 1,
              stagger: 0.1,
              ease: "none",
              scrollTrigger: { trigger: "[data-statement]", start: "top 70%", end: "bottom 55%", scrub: true },
            },
          );
        }

        // Toll: numbers count up once, when they come into view.
        if (root.current) countUp(root.current, lang);
        gsap.to("[data-toll-img] img", {
          yPercent: -10,
          scale: 1.08,
          ease: "none",
          scrollTrigger: { trigger: "[data-toll]", start: "top bottom", end: "bottom top", scrub: true },
        });

        // Clearing sky: the haze lifts as the section scrolls through.
        gsap.fromTo(
          "[data-smog-veil]",
          { opacity: 0.92 },
          {
            opacity: 0,
            ease: "none",
            scrollTrigger: { trigger: "[data-clear]", start: "top 80%", end: "center 40%", scrub: true },
          },
        );
        gsap.fromTo(
          "[data-clear] img",
          { filter: "blur(6px) saturate(0.4)", scale: 1.1 },
          {
            filter: "blur(0px) saturate(1)",
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: "[data-clear]", start: "top 80%", end: "center 40%", scrub: true },
          },
        );

        // Put the original text back when motion is switched off or the page unmounts.
        return () => {
          heroWords?.revert();
          statementWords?.revert();
        };
      });

      // Causes: a pinned horizontal gallery on wide screens; a plain list otherwise.
      mm.add(`(min-width: 900px) and ${MOTION_OK}`, () => {
        const section = document.querySelector<HTMLElement>("[data-causes]");
        const track = document.querySelector<HTMLElement>("[data-track]");
        if (!section || !track) return;
        const distance = () => track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
      });

      // How it works: the preview beside the steps follows the step in view.
      const panes = gsap.utils.toArray<HTMLElement>("[data-pane]");
      gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (!self.isActive) return;
            panes.forEach((p, j) => (p.dataset.active = String(i === j)));
            gsap.utils.toArray<HTMLElement>("[data-step]").forEach((s, j) => (s.dataset.active = String(i === j)));
          },
        });
      });
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      {/* ---------------------------------------------------------- hero */}
      <section data-hero className="on-night relative isolate flex min-h-[100svh] items-end overflow-hidden bg-night text-white">
        <div className="absolute inset-0 -z-10">
          <div data-hero-img className="h-full w-full">
            <Photo photo={PHOTOS.indiaGateNight} priority className="grain h-full w-full" imgClassName="h-full w-full" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_100%,rgb(15_19_26/0.95)_0%,rgb(15_19_26/0.55)_45%,rgb(15_19_26/0.2)_75%),linear-gradient(180deg,rgb(15_19_26/0.6)_0%,transparent_30%)]" />
        </div>

        <div data-hero-copy className="mx-auto w-full max-w-[90rem] px-5 pb-14 pt-36 sm:px-8 md:pb-20">
          {delhi && (
            <Link
              to="/world"
              data-hero-fade
              className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 py-1.5 pl-2 pr-4 text-sm text-white/90 backdrop-blur-md hover:border-white/50"
            >
              <span className="relative flex size-2.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 [animation-iteration-count:4]"
                  style={{ background: bandFor(delhi.aqi).color }}
                />
                <span className="relative inline-flex size-2.5 rounded-full" style={{ background: bandFor(delhi.aqi).color }} />
              </span>
              {tx(copy.live)
                .replace("{aqi}", String(delhi.aqi))
                .replace("{band}", t(`band.${bandFor(delhi.aqi).id}` as MessageKey).toLowerCase())}
            </Link>
          )}

          <h1 data-split tabIndex={-1} className="display max-w-[15ch] text-[clamp(2.9rem,7.6vw,7rem)] outline-none">
            {tx(copy.heroTitle)}
          </h1>
          <p data-hero-fade className="lede mt-7 max-w-[52ch] text-white/80">
            {tx(copy.heroLede)}
          </p>
          <div data-hero-fade className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/plan" className="btn btn-primary min-h-13 px-7 text-lg">
              {tx(copy.heroCta)}
              <ArrowRight aria-hidden="true" size={19} />
            </Link>
            <Link to="/world" className="btn btn-ghost-night min-h-13 px-6 text-lg">
              {tx(copy.heroSecondary)}
            </Link>
          </div>
        </div>

        <span
          data-hero-fade
          aria-hidden="true"
          className="absolute bottom-6 right-6 hidden items-center gap-2 text-xs text-white/60 md:flex"
        >
          {tx(copy.scroll)}
          <ArrowDown size={14} className="animate-bounce [animation-iteration-count:3]" />
        </span>
      </section>

      {/* ----------------------------------------------------- statement */}
      <section data-statement className="on-night bg-night text-white">
        <div className="mx-auto max-w-[90rem] px-5 py-28 sm:px-8 md:py-44">
          <p data-scrub-words className="display max-w-[22ch] text-[clamp(2rem,4.6vw,4.3rem)] leading-[1.12]">
            {tx(copy.statement)}
          </p>
          <Cite source={SRC.who2022} className="mt-10 inline-block text-mist-2" />
        </div>
      </section>

      {/* ---------------------------------------------------------- toll */}
      <section data-toll aria-labelledby="toll-heading" className="bg-haze text-ink">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-5 py-24 sm:px-8 md:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 id="toll-heading" className="display text-[clamp(2.4rem,5vw,4.5rem)]">
              {tx(copy.tollTitle)}
            </h2>
            <div data-toll-img className="mt-10 aspect-[4/5] overflow-hidden rounded-[1.75rem]">
              <Photo
                photo={PHOTOS.boyMask}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="h-full w-full"
                imgClassName="h-full w-full scale-105"
              />
            </div>
          </div>
          <dl className="m-0 grid content-start">
            {STATS.map((s, i) => {
              const final = fmtFixed(s.value[lang], s.decimals[lang], s.format[lang], lang);
              return (
                <div key={i} className="grid gap-3 border-t border-line py-10 first:border-t-0 first:pt-0">
                  <dt className="font-display text-[clamp(3.4rem,8vw,6.8rem)] leading-[0.9] font-light tracking-[-0.04em] text-ink">
                    <span data-count={s.value[lang]} data-decimals={s.decimals[lang]} data-format={s.format[lang]}>
                      {final}
                    </span>
                  </dt>
                  <dd className="m-0 grid max-w-[44ch] gap-3">
                    <span className="text-xl leading-snug">{tx(s.body)}</span>
                    <Cite source={s.source} className="text-ink-2" />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      {/* -------------------------------------------------------- causes */}
      <section data-causes aria-labelledby="causes-heading" className="on-night overflow-hidden bg-night-2 text-white">
        <div
          data-track
          className="flex flex-col gap-6 px-5 py-24 sm:px-8 min-[900px]:h-[100svh] min-[900px]:w-max min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-8 min-[900px]:py-0 min-[900px]:pl-[max(2rem,calc((100vw-90rem)/2+2rem))] min-[900px]:pr-[12vw]"
        >
          <div className="max-w-md shrink-0 min-[900px]:w-[30rem]">
            <h2 id="causes-heading" className="display text-[clamp(2.4rem,5vw,4.6rem)]">
              {tx(copy.causesTitle)}
            </h2>
            <p className="lede mt-6 text-mist">{tx(copy.causesLede)}</p>
            <Cite source={SRC.stubble} className="mt-6 inline-block text-mist-2" />
          </div>
          {CAUSES.map((c, i) => (
            <article key={i} className="grid shrink-0 gap-5 min-[900px]:w-[min(34rem,42vw)]">
              <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] min-[900px]:aspect-[5/6]">
                <Photo
                  photo={c.photo}
                  sizes="(min-width: 900px) 40vw, 100vw"
                  className="h-full w-full"
                  imgClassName="h-full w-full"
                />
              </div>
              <div>
                <h3 className="font-display text-3xl">{tx(c.title)}</h3>
                <p className="mt-2 max-w-[48ch] text-mist">{tx(c.body)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- how */}
      <section aria-labelledby="how-heading" className="bg-paper text-ink">
        <div className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 md:py-32">
          <h2 id="how-heading" className="display max-w-[14ch] text-[clamp(2.4rem,5vw,4.6rem)]">
            {tx(copy.howTitle)}
          </h2>
          <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
            <ol className="m-0 grid list-none gap-0 p-0">
              {STEPS.map((s, i) => (
                <li
                  key={i}
                  data-step
                  data-active={i === 0}
                  className="group grid gap-3 border-t border-line py-10 transition-colors duration-500 lg:min-h-[52vh] lg:py-14 lg:data-[active=true]:border-accent-text"
                >
                  <span className="font-display text-lg text-ink-2 transition-colors group-data-[active=true]:text-accent-text">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight text-ink-2 transition-colors group-data-[active=true]:text-ink max-lg:text-ink">
                    {tx(s.title)}
                  </h3>
                  <p className="max-w-[44ch] text-lg text-ink-2">{tx(s.body)}</p>
                  <div className="mt-6 lg:hidden" aria-hidden="true">
                    <StepPreview index={i} />
                  </div>
                </li>
              ))}
            </ol>
            <div className="hidden lg:block" aria-hidden="true">
              <div className="sticky top-28 grid h-[min(70vh,40rem)] place-items-center overflow-hidden rounded-[2rem] bg-night p-10">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    data-pane
                    data-active={i === 0}
                    className="col-start-1 row-start-1 w-full max-w-md translate-y-4 opacity-0 transition-[opacity,transform] duration-700 data-[active=true]:translate-y-0 data-[active=true]:opacity-100"
                  >
                    <StepPreview index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ clearing */}
      <section data-clear className="on-night relative isolate overflow-hidden bg-night text-white">
        <div className="absolute inset-0 -z-10">
          <Photo photo={PHOTOS.clearSky} className="h-full w-full" imgClassName="h-full w-full" />
          <div data-smog-veil className="absolute inset-0 bg-[#9b8a70] opacity-0 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_19_26/0.2)_0%,rgb(15_19_26/0.75)_100%)]" />
        </div>
        <div className="mx-auto flex min-h-[110svh] max-w-[90rem] flex-col justify-end px-5 pb-20 sm:px-8 md:pb-28">
          <h2 className="display max-w-[18ch] text-[clamp(2.4rem,5.6vw,5.2rem)]">{tx(copy.clearTitle)}</h2>
          <p className="lede mt-6 max-w-[48ch] text-white/85">{tx(copy.clearBody)}</p>
          <Link to="/plan" className="btn btn-primary mt-10 min-h-13 w-fit px-7 text-lg">
            {tx(copy.clearCta)}
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------- explore */}
      <section className="on-night bg-night text-white">
        <div className="mx-auto grid max-w-[90rem] gap-5 px-5 py-20 sm:px-8 md:grid-cols-2 md:py-28">
          <ExploreCard to="/world" photo={PHOTOS.dustSkyline} title={tx(copy.exploreWorld)} body={tx(copy.exploreWorldBody)} />
          <ExploreCard to="/smog" photo={PHOTOS.crossingHaze} title={tx(copy.exploreSmog)} body={tx(copy.exploreSmogBody)} />
        </div>
      </section>
    </div>
  );
}
