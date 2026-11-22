import { useRef } from "react";
import { PHOTOS } from "../content/photos";
import { SRC, useText } from "../content/text";
import { copy, FACTS } from "../content/world";
import { useWorldAir } from "../hooks/useWorldAir";
import type { CityAir } from "../lib/api/world";
import { bandFor } from "../lib/aqi";
import { fmtFixed, fmtNumber } from "../lib/format";
import { gsap, MOTION_OK, useGSAP } from "../lib/motion";
import { useApp } from "../state/AppState";
import { countUp, parallax } from "../site/animations";
import { PageHero } from "../site/PageHero";
import { Cite, Photo } from "../site/Photo";
import { CtaLink, PhotoBackdrop, Section, SectionTitle } from "../site/Section";
import { useSmoothScroll } from "../site/useSmoothScroll";

export default function WorldPage() {
  useSmoothScroll();
  const root = useRef<HTMLDivElement>(null);
  const { lang } = useApp();
  const tx = useText();
  const world = useWorldAir();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (root.current) countUp(root.current, lang);
        gsap.from("[data-bar]", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1.4,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: "[data-board]", start: "top 75%", once: true },
        });
        parallax("[data-borders] img", "[data-borders]", { yPercent: 12, scale: 1.1 });
      });
    },
    { scope: root, dependencies: [lang, world.data?.length ?? 0], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      <PageHero photo={PHOTOS.dustSkyline} title={tx(copy.title)} lede={tx(copy.lede)} />

      <Section data-board tone="haze" labelledBy="board">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
          <SectionTitle id="board">{tx(copy.boardTitle)}</SectionTitle>
          <p className="max-w-[52ch] text-ink-2 md:justify-self-end">{tx(copy.boardNote)}</p>
        </div>

        <div aria-live="polite" className="mt-14">
          {world.error && !world.data && <p className="text-warn">{tx(copy.boardError)}</p>}
          {!world.data && !world.error && <p className="text-ink-2">{tx(copy.boardLoading)}</p>}
          {world.data && <CityBoard cities={world.data} />}
        </div>
      </Section>

      <Section tone="night" labelledBy="global">
        <SectionTitle id="global">{tx(copy.globalTitle)}</SectionTitle>
        <dl className="m-0 mt-14 grid gap-x-16 md:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.source.url} className="grid gap-3 border-t border-white/15 py-10">
              <dt className="font-display text-[clamp(3.2rem,7vw,6rem)] leading-[0.9] font-light tracking-[-0.04em]">
                <span data-count={f.value} data-decimals={f.decimals} data-format={f.format[lang]}>
                  {fmtFixed(f.value, f.decimals, f.format[lang], lang)}
                </span>
              </dt>
              <dd className="m-0 grid max-w-[42ch] gap-3">
                <span className="text-lg text-white/85">{tx(f.body)}</span>
                <Cite source={f.source} className="text-mist-2" />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="paper" labelledBy="south" inner="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="aspect-[4/5] overflow-hidden rounded-[1.75rem] lg:order-2">
          <Photo
            photo={PHOTOS.maskedWalk}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="h-full w-full"
            imgClassName="h-full w-full"
          />
        </div>
        <div>
          <SectionTitle id="south">{tx(copy.southTitle)}</SectionTitle>
          <p className="lede mt-7 max-w-[52ch] text-ink-2">{tx(copy.southBody)}</p>
          <Cite source={SRC.iqair2024} className="mt-4 inline-block text-ink-2" />
          <p className="mt-10 max-w-[30ch] border-l-4 border-accent pl-6 font-display text-[clamp(1.6rem,2.6vw,2.2rem)] leading-snug">
            {tx(copy.southYears)}
          </p>
          <Cite source={SRC.aqli2025} className="mt-4 inline-block text-ink-2" />
        </div>
      </Section>

      <section
        data-borders
        aria-labelledby="borders-heading"
        className="on-night relative isolate overflow-hidden bg-night text-white"
      >
        <PhotoBackdrop
          photo={PHOTOS.wildfire}
          overlay="bg-[linear-gradient(180deg,rgb(15_19_26/0.35)_0%,rgb(15_19_26/0.9)_100%)]"
        />
        <div className="mx-auto flex min-h-[95svh] max-w-[90rem] flex-col justify-end px-5 pb-20 sm:px-8 md:pb-28">
          <h2 id="borders-heading" className="display text-[clamp(2.6rem,6vw,5.4rem)]">
            {tx(copy.bordersTitle)}
          </h2>
          <p className="lede mt-6 max-w-[56ch] text-white/85">{tx(copy.bordersBody)}</p>
          <CtaLink to="/plan" className="mt-10">
            {tx(copy.cta)}
          </CtaLink>
        </div>
      </section>
    </div>
  );
}

/** Live city ranking. Scrolls sideways on narrow screens, so the region is keyboard-focusable. */
function CityBoard({ cities }: { cities: readonly CityAir[] }) {
  const { t, lang } = useApp();
  const tx = useText();
  // Bars share one scale; anything at or past "very unhealthy" (300) fills the track.
  const max = Math.max(300, ...cities.map((c) => c.aqi));

  return (
    <div tabIndex={0} role="region" aria-label={tx(copy.boardTable)} className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <caption className="sr-only">{tx(copy.boardTable)}</caption>
        <thead>
          <tr className="border-b-2 border-ink text-sm">
            <th scope="col" className="w-12 py-3 pr-3 font-semibold">
              #
            </th>
            <th scope="col" className="py-3 pr-4 font-semibold">
              {tx(copy.colCity)}
            </th>
            <th scope="col" className="w-[38%] py-3 pr-4 font-semibold">
              {tx(copy.colAqi)}
            </th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">
              {tx(copy.colPm)}
            </th>
            <th scope="col" className="py-3 text-right font-semibold">
              {tx(copy.colCigs)}
            </th>
          </tr>
        </thead>
        <tbody>
          {cities.map((c, rank) => {
            const band = bandFor(c.aqi);
            return (
              <tr key={c.city.id} className="border-b border-line align-middle">
                <td className="py-5 pr-3 font-display text-xl text-ink-2 tabular-nums">{rank + 1}</td>
                <th scope="row" className="py-5 pr-4 font-normal">
                  <span className="block font-display text-2xl leading-tight">{tx(c.city.name)}</span>
                  <span className="text-sm text-ink-2">{tx(c.city.country)}</span>
                </th>
                <td className="py-5 pr-4">
                  <span className="flex items-center gap-4">
                    <span className="w-12 shrink-0 font-display text-3xl font-light tabular-nums">{c.aqi}</span>
                    <span className="grid flex-1 gap-1.5">
                      <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-paper-2">
                        <span
                          data-bar
                          data-band-swatch
                          className="block h-full rounded-full"
                          style={{ width: `${Math.min(100, (c.aqi / max) * 100)}%`, background: band.color }}
                        />
                      </span>
                      <span className="text-sm text-ink-2">{t(`band.${band.id}`)}</span>
                    </span>
                  </span>
                </td>
                <td className="py-5 pr-4 text-right font-display text-xl">{fmtNumber(c.pm25, lang, 1)}</td>
                <td className="py-5 text-right font-display text-2xl tabular-nums">{fmtNumber(c.cigarettes, lang, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
