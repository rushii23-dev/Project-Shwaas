import { useRef } from "react";
import { Check, X } from "lucide-react";
import { PHOTOS } from "../content/photos";
import { BAND_ADVICE, BODY, copy, DOESNT, MYTHS, WORKS, type Evidence } from "../content/smog";
import { SRC, useText } from "../content/text";
import { BANDS } from "../lib/aqi";
import { gsap, MOTION_OK, useGSAP } from "../lib/motion";
import { useApp } from "../state/AppState";
import { parallax } from "../site/animations";
import { PageHero } from "../site/PageHero";
import { Cite } from "../site/Photo";
import { CtaLink, PhotoBackdrop, Section, SectionTitle } from "../site/Section";
import { useSmoothScroll } from "../site/useSmoothScroll";

export default function SmogPage() {
  useSmoothScroll();
  const root = useRef<HTMLDivElement>(null);
  const { t, lang } = useApp();
  const tx = useText();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-particle]", {
          scale: 0,
          transformOrigin: "center",
          duration: 1.6,
          ease: "expo.out",
          stagger: 0.25,
          scrollTrigger: { trigger: "[data-size]", start: "top 70%", once: true },
        });
        parallax("[data-cta] img", "[data-cta]", { yPercent: 10, scale: 1.08 });
      });
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      <PageHero photo={PHOTOS.crossingHaze} title={tx(copy.title)} lede={tx(copy.lede)} />

      <Section data-size tone="haze" labelledBy="size" inner="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionTitle id="size">{tx(copy.sizeTitle)}</SectionTitle>
          <p className="lede mt-7 max-w-[50ch] text-ink-2">{tx(copy.sizeBody)}</p>
          <Cite source={SRC.epaPm} className="mt-5 inline-block text-ink-2" />
        </div>
        <ParticleSizes hair={tx(copy.hair)} pm10={tx(copy.pm10)} pm25={tx(copy.pm25)} />
      </Section>

      <Section tone="night" labelledBy="body" inner="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <SectionTitle id="body" className="lg:sticky lg:top-28">
            {tx(copy.bodyTitle)}
          </SectionTitle>
        </div>
        <div>
          <dl className="m-0 grid">
            {BODY.map((b) => (
              <div key={b.title.en} className="grid gap-2 border-t border-white/15 py-9 md:grid-cols-[12rem_1fr] md:gap-10">
                <dt className="font-display text-3xl">{tx(b.title)}</dt>
                <dd className="m-0 max-w-[52ch] text-lg text-white/80">{tx(b.body)}</dd>
              </div>
            ))}
          </dl>
          <Cite source={SRC.soga2024} className="mt-4 inline-block text-mist-2" />
        </div>
      </Section>

      <Section tone="paper" labelledBy="aqi">
        <SectionTitle id="aqi" className="max-w-[18ch]">
          {tx(copy.aqiTitle)}
        </SectionTitle>
        <p className="lede mt-6 max-w-[56ch] text-ink-2">{tx(copy.aqiBody)}</p>
        <ol className="mt-14 grid list-none gap-0 p-0">
          {BANDS.map((b) => (
            <li key={b.id} className="grid items-center gap-x-8 gap-y-2 border-t border-line py-6 md:grid-cols-[9rem_16rem_1fr]">
              <span className="font-display text-2xl tabular-nums">
                {b.min}–{Number.isFinite(b.max) ? b.max : "500"}
              </span>
              <span className="inline-flex w-fit items-center gap-3 font-semibold">
                <span aria-hidden="true" data-band-swatch className="size-4 rounded-full" style={{ background: b.color }} />
                {t(`band.${b.id}`)}
              </span>
              <span className="max-w-[60ch] text-ink-2">{tx(BAND_ADVICE[b.id])}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="haze" labelledBy="protect">
        <SectionTitle id="protect" className="max-w-[18ch]">
          {tx(copy.protectTitle)}
        </SectionTitle>
        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-20">
          <EvidenceList heading={tx(copy.works)} items={WORKS} good />
          <EvidenceList heading={tx(copy.doesnt)} items={DOESNT} good={false} />
        </div>
      </Section>

      <Section tone="night2" labelledBy="myth">
        <SectionTitle id="myth">{tx(copy.mythTitle)}</SectionTitle>
        <div className="mt-12 grid">
          {MYTHS.map((m) => (
            <details key={m.myth.en} className="group border-t border-white/15 py-7 last:border-b">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-[clamp(1.5rem,2.6vw,2.2rem)] leading-snug marker:hidden">
                <span>{tx(m.myth)}</span>
                <span
                  aria-hidden="true"
                  className="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-white/25 text-xl transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-[62ch] text-lg text-white/80">{tx(m.fact)}</p>
            </details>
          ))}
        </div>
      </Section>

      <section data-cta aria-labelledby="cta-heading" className="on-night relative isolate overflow-hidden bg-night text-white">
        <PhotoBackdrop
          photo={PHOTOS.metro}
          overlay="bg-[linear-gradient(90deg,rgb(15_19_26/0.92)_0%,rgb(15_19_26/0.55)_60%,rgb(15_19_26/0.3)_100%)]"
        />
        <div className="mx-auto flex min-h-[80svh] max-w-[90rem] flex-col justify-center px-5 py-24 sm:px-8">
          <h2 id="cta-heading" className="display max-w-[16ch] text-[clamp(2.6rem,6vw,5.4rem)]">
            {tx(copy.ctaTitle)}
          </h2>
          <p className="lede mt-6 max-w-[46ch] text-white/85">{tx(copy.ctaBody)}</p>
          <CtaLink to="/plan" className="mt-10">
            {tx(copy.cta)}
          </CtaLink>
        </div>
      </section>
    </div>
  );
}

/** PM2.5 and PM10 drawn to scale against a human hair. */
function ParticleSizes({ hair, pm10, pm25 }: { hair: string; pm10: string; pm25: string }) {
  return (
    <figure className="m-0">
      <svg viewBox="0 0 420 300" className="h-auto w-full" role="img" aria-label={`${hair}; ${pm10}; ${pm25}`}>
        <circle
          data-particle
          cx="150"
          cy="150"
          r="140"
          fill="none"
          stroke="var(--ink-2)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <circle data-particle cx="330" cy="110" r="20" fill="var(--accent-soft)" stroke="var(--accent-text)" strokeWidth="1.5" />
        <circle data-particle cx="330" cy="200" r="5" fill="var(--accent-text)" />
      </svg>
      <figcaption className="mt-4 grid gap-1.5 text-sm text-ink-2 sm:grid-cols-3">
        <span>{hair}</span>
        <span>{pm10}</span>
        <span className="font-semibold text-ink">{pm25}</span>
      </figcaption>
    </figure>
  );
}

function EvidenceList({ heading, items, good }: { heading: string; items: readonly Evidence[]; good: boolean }) {
  const tx = useText();
  const Icon = good ? Check : X;
  return (
    <div>
      <h3 className="flex items-center gap-3 border-b-2 border-ink pb-4 text-xl font-semibold">
        <span className={`grid size-8 place-items-center rounded-full text-paper ${good ? "bg-ok" : "bg-ink"}`}>
          <Icon aria-hidden="true" size={16} strokeWidth={3} />
        </span>
        {heading}
      </h3>
      <ul className="grid">
        {items.map((it) => (
          <li key={it.title.en} className="grid gap-1.5 border-b border-line py-6">
            <span className="font-display text-2xl leading-snug">{tx(it.title)}</span>
            <span className="text-ink-2">{tx(it.detail)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
