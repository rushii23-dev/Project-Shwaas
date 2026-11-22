import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { PHOTOS } from "../content/photos";
import { SRC, useText, type Bilingual, type Source } from "../content/text";
import { useWorldAir } from "../hooks/useWorldAir";
import { bandFor } from "../lib/aqi";
import { fmtFixed, fmtNumber } from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import { gsap, MOTION_OK, useGSAP } from "../lib/motion";
import { Link } from "../router";
import { useApp } from "../state/AppState";
import { countUp } from "../site/animations";
import { PageHero } from "../site/PageHero";
import { Cite, Photo } from "../site/Photo";
import { useSmoothScroll } from "../site/useSmoothScroll";

const copy = {
  title: { en: "The air we share", hi: "हम सबकी हवा" },
  lede: {
    en: "Air pollution is now the world's second-biggest risk factor for death. Here is what the air looks like right now, and what it is doing to us.",
    hi: "वायु प्रदूषण अब दुनिया में मौत का दूसरा सबसे बड़ा जोखिम है। देखिए अभी हवा कैसी है, और यह हमारे साथ क्या कर रही है।",
  },
  boardTitle: { en: "Right now, in fourteen cities", hi: "अभी, चौदह शहरों में" },
  boardTable: { en: "Live air quality by city", hi: "शहरवार लाइव हवा" },
  boardNote: {
    en: "Live from the Copernicus atmosphere model via Open-Meteo, updated hourly. Cigarettes are an indicative day-long equivalent at the current PM2.5 level.",
    hi: "Copernicus वायुमंडल मॉडल से Open-Meteo के ज़रिए लाइव, हर घंटे अपडेट। सिगरेट की संख्या मौजूदा PM2.5 पर पूरे दिन का अनुमानित बराबर है।",
  },
  boardError: {
    en: "The live readings couldn't load. Check your connection and refresh the page.",
    hi: "लाइव आँकड़े लोड नहीं हो सके। इंटरनेट जाँचें और पेज रीफ़्रेश करें।",
  },
  boardLoading: { en: "Fetching live readings…", hi: "लाइव आँकड़े आ रहे हैं…" },
  colCity: { en: "City", hi: "शहर" },
  colAqi: { en: "US AQI", hi: "US AQI" },
  colPm: { en: "PM2.5 (µg/m³)", hi: "PM2.5 (µg/m³)" },
  colCigs: { en: "Like smoking, per day", hi: "रोज़ इतनी सिगरेट जैसा" },
  globalTitle: { en: "The global picture", hi: "पूरी दुनिया की तस्वीर" },
  southTitle: { en: "Where it is worst", hi: "जहाँ हालत सबसे ख़राब है" },
  southBody: {
    en: "South Asia carries the heaviest burden on Earth. In 2024, 13 of the world's 20 most polluted cities were in India, and Delhi's annual PM2.5 averaged 91.6 µg/m³: more than eighteen times the WHO guideline. The worst single city was Byrnihat, an industrial town on the Assam–Meghalaya border, at 128.2 µg/m³.",
    hi: "दक्षिण एशिया पर धरती का सबसे भारी बोझ है। 2024 में दुनिया के 20 सबसे प्रदूषित शहरों में से 13 भारत में थे, और दिल्ली का सालाना औसत PM2.5 91.6 µg/m³ रहा: WHO के मानक से अठारह गुना से ज़्यादा। सबसे प्रदूषित शहर असम–मेघालय सीमा का औद्योगिक कस्बा बर्नीहाट रहा, 128.2 µg/m³ के साथ।",
  },
  southYears: {
    en: "If India met the WHO guideline, the average person would live about 3.5 years longer. In Delhi, the gain would be 8.2 years.",
    hi: "अगर भारत WHO का मानक पूरा करे, तो औसत व्यक्ति लगभग 3.5 साल ज़्यादा जिएगा। दिल्ली में यह फ़ायदा 8.2 साल का होगा।",
  },
  bordersTitle: { en: "Smoke has no borders", hi: "धुएँ की कोई सरहद नहीं" },
  bordersBody: {
    en: "Wildfire smoke and desert dust travel thousands of kilometres. In June 2023, smoke from Canada's wildfires turned New York's sky orange. Stubble smoke from the Punjab plains settles over Delhi, Lahore and beyond. Clean air is a shared problem, and every city's choices reach its neighbours.",
    hi: "जंगल की आग का धुआँ और रेगिस्तान की धूल हज़ारों किलोमीटर तक जाती है। जून 2023 में कनाडा के जंगलों की आग के धुएँ ने न्यूयॉर्क का आसमान नारंगी कर दिया। पंजाब के मैदानों की पराली का धुआँ दिल्ली, लाहौर और उससे आगे तक फैलता है। साफ़ हवा सबकी साझा समस्या है, और हर शहर के फ़ैसले उसके पड़ोसियों तक पहुँचते हैं।",
  },
  cta: { en: "Plan your family's day", hi: "अपने परिवार का दिन प्लान करें" },
} satisfies Record<string, Bilingual>;

interface Fact {
  value: number;
  decimals: number;
  format: Bilingual;
  body: Bilingual;
  source: Source;
}

const FACTS: Fact[] = [
  {
    value: 99,
    decimals: 0,
    format: { en: "{n}%", hi: "{n}%" },
    body: {
      en: "of the world's population breathes air above WHO's limits.",
      hi: "दुनिया की आबादी WHO की सीमा से ज़्यादा प्रदूषित हवा में साँस लेती है।",
    },
    source: SRC.who2022,
  },
  {
    value: 8.1,
    decimals: 1,
    format: { en: "{n} million", hi: "{n} मिलियन" },
    body: {
      en: "deaths linked to air pollution in 2021, second only to high blood pressure as a risk factor.",
      hi: "मौतें 2021 में वायु प्रदूषण से जुड़ी थीं; जोखिम के रूप में यह सिर्फ़ हाई ब्लड प्रेशर से पीछे है।",
    },
    source: SRC.soga2024,
  },
  {
    value: 2.1,
    decimals: 1,
    format: { en: "{n} billion", hi: "{n} अरब" },
    body: {
      en: "people still cook on open fires or inefficient stoves, filling homes with smoke.",
      hi: "लोग अब भी खुली आग या पुराने चूल्हों पर खाना बनाते हैं, जिससे घर धुएँ से भर जाते हैं।",
    },
    source: SRC.whoHousehold,
  },
  {
    value: 5,
    decimals: 0,
    format: { en: "{n} µg/m³", hi: "{n} µg/m³" },
    body: {
      en: "is the WHO's annual PM2.5 guideline. Delhi averaged more than eighteen times that in 2024.",
      hi: "WHO का सालाना PM2.5 मानक है। 2024 में दिल्ली का औसत इससे अठारह गुना से ज़्यादा रहा।",
    },
    source: SRC.whoGuidelines,
  },
];

export default function WorldPage() {
  useSmoothScroll();
  const root = useRef<HTMLDivElement>(null);
  const { t, lang } = useApp();
  const tx = useText();
  const world = useWorldAir();
  const max = Math.max(300, ...(world.data ?? []).map((c) => c.aqi));

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
        gsap.to("[data-borders] img", {
          yPercent: 12,
          scale: 1.1,
          ease: "none",
          scrollTrigger: { trigger: "[data-borders]", start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    },
    { scope: root, dependencies: [lang, world.data?.length ?? 0], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      <PageHero photo={PHOTOS.dustSkyline} title={tx(copy.title)} lede={tx(copy.lede)} />

      {/* Live board */}
      <section data-board aria-labelledby="board-heading" className="bg-haze text-ink">
        <div className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 md:py-32">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
            <h2 id="board-heading" className="display text-[clamp(2.4rem,5vw,4.4rem)]">
              {tx(copy.boardTitle)}
            </h2>
            <p className="max-w-[52ch] text-ink-2 md:justify-self-end">{tx(copy.boardNote)}</p>
          </div>

          <div aria-live="polite" className="mt-14">
            {world.error && !world.data && <p className="text-warn">{tx(copy.boardError)}</p>}
            {!world.data && !world.error && <p className="text-ink-2">{tx(copy.boardLoading)}</p>}
            {world.data && (
              <div tabIndex={0} role="region" aria-label={tx(copy.boardTable)} className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-left">
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
                    {world.data.map((c, i) => {
                      const band = bandFor(c.aqi);
                      return (
                        <tr key={c.city.id} className="border-b border-line align-middle">
                          <td className="py-5 pr-3 font-display text-xl text-ink-2 tabular-nums">{i + 1}</td>
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
                                <span className="text-sm text-ink-2">{t(`band.${band.id}` as MessageKey)}</span>
                              </span>
                            </span>
                          </td>
                          <td className="py-5 pr-4 text-right font-display text-xl">{fmtNumber(c.pm25, lang, 1)}</td>
                          <td className="py-5 text-right font-display text-2xl tabular-nums">
                            {fmtNumber(c.cigarettes, lang, 1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Global numbers */}
      <section aria-labelledby="global-heading" className="on-night bg-night text-white">
        <div className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 md:py-32">
          <h2 id="global-heading" className="display text-[clamp(2.4rem,5vw,4.4rem)]">
            {tx(copy.globalTitle)}
          </h2>
          <dl className="m-0 mt-14 grid gap-x-16 md:grid-cols-2">
            {FACTS.map((f, i) => (
              <div key={i} className="grid gap-3 border-t border-white/15 py-10">
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
        </div>
      </section>

      {/* South Asia */}
      <section aria-labelledby="south-heading" className="bg-paper text-ink">
        <div className="mx-auto grid max-w-[90rem] items-center gap-12 px-5 py-24 sm:px-8 md:py-32 lg:grid-cols-2 lg:gap-20">
          <div className="aspect-[4/5] overflow-hidden rounded-[1.75rem] lg:order-2">
            <Photo
              photo={PHOTOS.maskedWalk}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="h-full w-full"
              imgClassName="h-full w-full"
            />
          </div>
          <div>
            <h2 id="south-heading" className="display text-[clamp(2.4rem,5vw,4.4rem)]">
              {tx(copy.southTitle)}
            </h2>
            <p className="lede mt-7 max-w-[52ch] text-ink-2">{tx(copy.southBody)}</p>
            <Cite source={SRC.iqair2024} className="mt-4 inline-block text-ink-2" />
            <p className="mt-10 max-w-[30ch] border-l-4 border-accent pl-6 font-display text-[clamp(1.6rem,2.6vw,2.2rem)] leading-snug">
              {tx(copy.southYears)}
            </p>
            <Cite source={SRC.aqli2025} className="mt-4 inline-block text-ink-2" />
          </div>
        </div>
      </section>

      {/* No borders */}
      <section
        data-borders
        aria-labelledby="borders-heading"
        className="on-night relative isolate overflow-hidden bg-night text-white"
      >
        <div className="absolute inset-0 -z-10">
          <Photo photo={PHOTOS.wildfire} className="h-full w-full" imgClassName="h-full w-full" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_19_26/0.35)_0%,rgb(15_19_26/0.9)_100%)]" />
        </div>
        <div className="mx-auto flex min-h-[95svh] max-w-[90rem] flex-col justify-end px-5 pb-20 sm:px-8 md:pb-28">
          <h2 id="borders-heading" className="display text-[clamp(2.6rem,6vw,5.4rem)]">
            {tx(copy.bordersTitle)}
          </h2>
          <p className="lede mt-6 max-w-[56ch] text-white/85">{tx(copy.bordersBody)}</p>
          <Link to="/plan" className="btn btn-primary mt-10 min-h-13 w-fit px-7 text-lg">
            {tx(copy.cta)}
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
        </div>
      </section>
    </div>
  );
}
