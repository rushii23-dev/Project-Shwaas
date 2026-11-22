import { useRef } from "react";
import { ArrowDown } from "lucide-react";
import { CAUSES, copy, STATS, STEPS } from "../content/home";
import { PHOTOS } from "../content/photos";
import { SRC, useText } from "../content/text";
import { useWorldAir } from "../hooks/useWorldAir";
import { fmtFixed } from "../lib/format";
import { Link } from "../router";
import { useApp } from "../state/AppState";
import { Cite, Photo } from "../site/Photo";
import { COLUMN, CtaLink, PhotoBackdrop, Section, SectionTitle } from "../site/Section";
import { useSmoothScroll } from "../site/useSmoothScroll";
import { ExploreCard } from "./home/ExploreCard";
import { LiveChip } from "./home/LiveChip";
import { StepPreview } from "./home/StepPreview";
import { useHomeMotion } from "./home/useHomeMotion";

export default function HomePage() {
  useSmoothScroll();
  const root = useRef<HTMLDivElement>(null);
  const { lang } = useApp();
  const tx = useText();
  const world = useWorldAir();
  const delhi = world.data?.find((c) => c.city.id === "delhi");
  useHomeMotion(root, lang);

  return (
    <div ref={root}>
      {/* Hero */}
      <section data-hero className="on-night relative isolate flex min-h-[100svh] items-end overflow-hidden bg-night text-white">
        <div className="absolute inset-0 -z-10">
          <div data-hero-img className="h-full w-full">
            <Photo photo={PHOTOS.indiaGateNight} priority className="grain h-full w-full" imgClassName="h-full w-full" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_100%,rgb(15_19_26/0.95)_0%,rgb(15_19_26/0.55)_45%,rgb(15_19_26/0.2)_75%),linear-gradient(180deg,rgb(15_19_26/0.6)_0%,transparent_30%)]" />
        </div>

        <div data-hero-copy className={`${COLUMN} w-full pb-14 pt-36 md:pb-20`}>
          {delhi && <LiveChip city={delhi} />}
          <h1 data-split tabIndex={-1} className="display max-w-[15ch] text-[clamp(2.9rem,7.6vw,7rem)] outline-none">
            {tx(copy.heroTitle)}
          </h1>
          <p data-hero-fade className="lede mt-7 max-w-[52ch] text-white/80">
            {tx(copy.heroLede)}
          </p>
          <div data-hero-fade className="mt-10 flex flex-wrap items-center gap-3">
            <CtaLink to="/plan">{tx(copy.heroCta)}</CtaLink>
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

      {/* Statement */}
      <Section data-statement tone="night" pad="py-28 md:py-44">
        <p data-scrub-words className="display max-w-[22ch] text-[clamp(2rem,4.6vw,4.3rem)] leading-[1.12]">
          {tx(copy.statement)}
        </p>
        <Cite source={SRC.who2022} className="mt-10 inline-block text-mist-2" />
      </Section>

      {/* The human toll */}
      <Section data-toll tone="haze" labelledBy="toll" inner="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionTitle id="toll">{tx(copy.tollTitle)}</SectionTitle>
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
          {STATS.map((s) => (
            <div key={s.body.en} className="grid gap-3 border-t border-line py-10 first:border-t-0 first:pt-0">
              <dt className="font-display text-[clamp(3.4rem,8vw,6.8rem)] leading-[0.9] font-light tracking-[-0.04em] text-ink">
                <span data-count={s.value[lang]} data-decimals={s.decimals[lang]} data-format={s.format[lang]}>
                  {fmtFixed(s.value[lang], s.decimals[lang], s.format[lang], lang)}
                </span>
              </dt>
              <dd className="m-0 grid max-w-[44ch] gap-3">
                <span className="text-xl leading-snug">{tx(s.body)}</span>
                <Cite source={s.source} className="text-ink-2" />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Causes: a pinned sideways gallery on wide screens */}
      <section data-causes aria-labelledby="causes-heading" className="on-night overflow-hidden bg-night-2 text-white">
        <div
          data-track
          className="flex flex-col gap-6 px-5 py-24 sm:px-8 min-[900px]:h-[100svh] min-[900px]:w-max min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-8 min-[900px]:py-0 min-[900px]:pl-[max(2rem,calc((100vw-90rem)/2+2rem))] min-[900px]:pr-[12vw]"
        >
          <div className="max-w-md shrink-0 min-[900px]:w-[30rem]">
            <SectionTitle id="causes">{tx(copy.causesTitle)}</SectionTitle>
            <p className="lede mt-6 text-mist">{tx(copy.causesLede)}</p>
            <Cite source={SRC.stubble} className="mt-6 inline-block text-mist-2" />
          </div>
          {CAUSES.map((c) => (
            <article key={c.title.en} className="grid shrink-0 gap-5 min-[900px]:w-[min(34rem,42vw)]">
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

      {/* How Shwaas helps */}
      <Section tone="paper" labelledBy="how">
        <SectionTitle id="how" className="max-w-[14ch]">
          {tx(copy.howTitle)}
        </SectionTitle>
        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
          <ol className="m-0 grid list-none gap-0 p-0">
            {STEPS.map((s, i) => (
              <li
                key={s.title.en}
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
              {STEPS.map((s, i) => (
                <div
                  key={s.title.en}
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
      </Section>

      {/* The sky clears */}
      <section
        data-clear
        aria-labelledby="clear-heading"
        className="on-night relative isolate overflow-hidden bg-night text-white"
      >
        <PhotoBackdrop
          photo={PHOTOS.clearSky}
          overlay="bg-[linear-gradient(180deg,rgb(15_19_26/0.2)_0%,rgb(15_19_26/0.75)_100%)]"
        >
          <div data-smog-veil className="absolute inset-0 bg-[#9b8a70] opacity-0 mix-blend-multiply" />
        </PhotoBackdrop>
        <div className={`${COLUMN} flex min-h-[110svh] flex-col justify-end pb-20 md:pb-28`}>
          <h2 id="clear-heading" className="display max-w-[18ch] text-[clamp(2.4rem,5.6vw,5.2rem)]">
            {tx(copy.clearTitle)}
          </h2>
          <p className="lede mt-6 max-w-[48ch] text-white/85">{tx(copy.clearBody)}</p>
          <CtaLink to="/plan" className="mt-10">
            {tx(copy.clearCta)}
          </CtaLink>
        </div>
      </section>

      {/* Explore */}
      <Section tone="night" pad="py-20 md:py-28" inner="grid gap-5 md:grid-cols-2">
        <ExploreCard to="/world" photo={PHOTOS.dustSkyline} title={tx(copy.exploreWorld)} body={tx(copy.exploreWorldBody)} />
        <ExploreCard to="/smog" photo={PHOTOS.crossingHaze} title={tx(copy.exploreSmog)} body={tx(copy.exploreSmogBody)} />
      </Section>
    </div>
  );
}
