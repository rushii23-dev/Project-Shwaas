import { useRef } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { PHOTOS } from "../content/photos";
import { SRC, useText, type Bilingual } from "../content/text";
import { BANDS, type BandId } from "../lib/aqi";
import type { MessageKey } from "../lib/i18n";
import { gsap, MOTION_OK, useGSAP } from "../lib/motion";
import { Link } from "../router";
import { useApp } from "../state/AppState";
import { PageHero } from "../site/PageHero";
import { Cite, Photo } from "../site/Photo";
import { useSmoothScroll } from "../site/useSmoothScroll";

const copy = {
  title: { en: "Understanding winter smog", hi: "सर्दियों की धुंध को समझें" },
  lede: {
    en: "What is in the air, what it does to the body, and what actually protects your family. Plain answers, with the evidence behind them.",
    hi: "हवा में क्या है, यह शरीर पर क्या असर करता है, और असल में परिवार को क्या बचाता है। सीधे जवाब, सबूत के साथ।",
  },
  sizeTitle: { en: "Smaller than you can imagine", hi: "जितना आप सोच सकते हैं, उससे भी छोटा" },
  sizeBody: {
    en: "PM2.5 means particles 2.5 micrometres across or smaller: about thirty times thinner than a human hair. They slip past the nose and throat, settle deep in the lungs, and the finest pass into the bloodstream.",
    hi: "PM2.5 यानी 2.5 माइक्रोमीटर या उससे छोटे कण: इंसान के बाल से लगभग तीस गुना पतले। ये नाक और गले को पार कर फेफड़ों में गहरे बैठ जाते हैं, और सबसे बारीक कण ख़ून में पहुँच जाते हैं।",
  },
  hair: { en: "Human hair, about 70 µm", hi: "इंसान का बाल, लगभग 70 µm" },
  pm10: { en: "PM10 dust, 10 µm", hi: "PM10 धूल, 10 µm" },
  pm25: { en: "PM2.5, 2.5 µm", hi: "PM2.5, 2.5 µm" },
  bodyTitle: { en: "What it does to the body", hi: "यह शरीर पर क्या करता है" },
  aqiTitle: { en: "Reading the air quality index", hi: "एयर क्वालिटी इंडेक्स कैसे पढ़ें" },
  aqiBody: {
    en: "Shwaas uses the US AQI, the scale most air apps share. The number is a 0–500 summary of the worst pollutant; each band says who should change what.",
    hi: "श्वास US AQI इस्तेमाल करता है, जो ज़्यादातर एयर ऐप्स का साझा पैमाना है। यह 0–500 का अंक सबसे ख़राब प्रदूषक का सार है; हर स्तर बताता है कि किसे क्या बदलना चाहिए।",
  },
  protectTitle: { en: "What protects you, and what doesn't", hi: "क्या बचाता है, और क्या नहीं" },
  works: { en: "Works", hi: "काम करता है" },
  doesnt: { en: "Doesn't", hi: "काम नहीं करता" },
  mythTitle: { en: "Myths worth dropping", hi: "भ्रम जिन्हें छोड़ देना चाहिए" },
  ctaTitle: { en: "Put it into practice tomorrow morning.", hi: "कल सुबह से इसे अपनाइए।" },
  ctaBody: {
    en: "Shwaas turns all of this into a plan for your family's day, built around your city's forecast.",
    hi: "श्वास यह सब आपके शहर के पूर्वानुमान के हिसाब से आपके परिवार के दिन की योजना में बदल देता है।",
  },
  cta: { en: "Plan my family's day", hi: "मेरे परिवार का दिन प्लान करें" },
} satisfies Record<string, Bilingual>;

const BODY: { title: Bilingual; body: Bilingual }[] = [
  {
    title: { en: "Lungs", hi: "फेफड़े" },
    body: {
      en: "Inflames the airways, triggers asthma attacks and infections, and over years raises the risk of chronic lung disease and lung cancer.",
      hi: "साँस की नलियों में सूजन, अस्थमा के दौरे और संक्रमण; और सालों में फेफड़ों की पुरानी बीमारी और कैंसर का ख़तरा बढ़ाता है।",
    },
  },
  {
    title: { en: "Heart and brain", hi: "दिल और दिमाग़" },
    body: {
      en: "Particles in the blood stiffen arteries and raise the risk of heart attack and stroke, which together cause most air-pollution deaths.",
      hi: "ख़ून में पहुँचे कण धमनियों को सख़्त करते हैं और हार्ट अटैक और स्ट्रोक का ख़तरा बढ़ाते हैं, जो मिलकर प्रदूषण से होने वाली ज़्यादातर मौतों का कारण हैं।",
    },
  },
  {
    title: { en: "Children", hi: "बच्चे" },
    body: {
      en: "Children breathe faster, closer to the exhaust at street level, while their lungs are still growing. Exposure slows lung growth and drives pneumonia.",
      hi: "बच्चे तेज़ साँस लेते हैं, सड़क के धुएँ के ज़्यादा पास, जब उनके फेफड़े बढ़ ही रहे होते हैं। प्रदूषण फेफड़ों की बढ़त धीमी करता है और निमोनिया बढ़ाता है।",
    },
  },
  {
    title: { en: "Pregnancy", hi: "गर्भावस्था" },
    body: {
      en: "Exposure during pregnancy is linked to low birth weight and preterm birth.",
      hi: "गर्भावस्था में प्रदूषण का संबंध कम वज़न वाले और समय से पहले जन्म से है।",
    },
  },
];

const BAND_ADVICE: Record<BandId, Bilingual> = {
  good: { en: "Enjoy being outside.", hi: "बाहर रहने का आनंद लें।" },
  moderate: {
    en: "Unusually sensitive people should ease off long, hard exercise.",
    hi: "बहुत संवेदनशील लोग लंबा, भारी व्यायाम कम करें।",
  },
  sensitive: {
    en: "Children, older adults and anyone with heart or lung conditions should cut back on exertion outdoors.",
    hi: "बच्चे, बुज़ुर्ग और दिल या फेफड़ों के मरीज़ बाहर मेहनत वाले काम कम करें।",
  },
  unhealthy: {
    en: "Everyone should limit time outdoors; sensitive groups should stay in where possible.",
    hi: "सभी बाहर कम समय बिताएँ; संवेदनशील लोग जहाँ हो सके घर में रहें।",
  },
  very_unhealthy: {
    en: "Avoid exertion outdoors. Windows shut, purifier on, N95 if you must go out.",
    hi: "बाहर मेहनत से बचें। खिड़कियाँ बंद, प्यूरीफ़ायर चालू, बाहर जाना ही हो तो N95।",
  },
  hazardous: {
    en: "Stay indoors with filtered air. This is an emergency level.",
    hi: "फ़िल्टर की हुई हवा में घर के अंदर रहें। यह आपात स्तर है।",
  },
};

const WORKS: { title: Bilingual; detail: Bilingual }[] = [
  {
    title: { en: "A fitted N95 or FFP2 mask", hi: "ठीक से फ़िट N95 या FFP2 मास्क" },
    detail: {
      en: "Filters 90–95% of fine particles when sealed to the face.",
      hi: "चेहरे पर ठीक से बैठे तो 90–95% बारीक कण रोकता है।",
    },
  },
  {
    title: { en: "A HEPA purifier, sized to the room", hi: "कमरे के हिसाब से HEPA प्यूरीफ़ायर" },
    detail: {
      en: "Cuts indoor PM2.5 by 50–80%. Best in the bedroom, door shut.",
      hi: "घर का PM2.5 50–80% घटाता है। बेडरूम में, दरवाज़ा बंद रखकर सबसे अच्छा।",
    },
  },
  {
    title: { en: "A fan with a filter taped on", hi: "पंखे पर टेप से लगा फ़िल्टर" },
    detail: {
      en: "A low-cost DIY purifier: 40–60% cleaner air in a small room.",
      hi: "सस्ता घरेलू प्यूरीफ़ायर: छोटे कमरे में 40–60% साफ़ हवा।",
    },
  },
  {
    title: { en: "Timing", hi: "सही समय" },
    detail: {
      en: "Air often swings two-fold within a day. Exercise and air the house in the cleanest window.",
      hi: "हवा एक ही दिन में दोगुनी तक बदलती है। व्यायाम और खिड़कियाँ खोलना सबसे साफ़ समय में करें।",
    },
  },
  {
    title: { en: "Sealing gaps", hi: "दरारें बंद करना" },
    detail: {
      en: "Door sweeps and taped window gaps keep 10–25% of smog out.",
      hi: "डोर-स्वीप और खिड़कियों की दरारों पर टेप 10–25% धुंध बाहर रखते हैं।",
    },
  },
];

const DOESNT: { title: Bilingual; detail: Bilingual }[] = [
  {
    title: { en: "Cloth and loose surgical masks", hi: "कपड़े और ढीले सर्जिकल मास्क" },
    detail: {
      en: "Smog flows around the edges. They help little against PM2.5.",
      hi: "धुंध किनारों से अंदर आ जाती है। PM2.5 पर इनका असर बहुत कम है।",
    },
  },
  {
    title: { en: "Houseplants", hi: "घर के पौधे" },
    detail: {
      en: "You would need hundreds in a single room to match one purifier.",
      hi: "एक प्यूरीफ़ायर जितना असर पाने के लिए एक कमरे में सैकड़ों पौधे चाहिए।",
    },
  },
  {
    title: { en: 'Incense, dhoop or coils to "clean" the air', hi: 'हवा "साफ़" करने के लिए अगरबत्ती, धूप या कॉइल' },
    detail: {
      en: "They add smoke. One coil can emit as much fine particulate as dozens of cigarettes.",
      hi: "ये धुआँ बढ़ाते हैं। एक कॉइल दर्जनों सिगरेट जितने बारीक कण छोड़ सकती है।",
    },
  },
  {
    title: { en: "Driving with the windows down", hi: "शीशे खोलकर गाड़ी चलाना" },
    detail: {
      en: "You sit in the exhaust of the car ahead. Use recirculation instead.",
      hi: "आप आगे की गाड़ी के धुएँ में बैठे होते हैं। रीसर्कुलेशन चलाएँ।",
    },
  },
];

const MYTHS: { myth: Bilingual; fact: Bilingual }[] = [
  {
    myth: { en: "If the sky looks clear, the air is fine.", hi: "आसमान साफ़ दिखे तो हवा ठीक है।" },
    fact: {
      en: "PM2.5 is invisible at harmful levels long before it turns the sky grey. Check the number, not the view.",
      hi: "PM2.5 आसमान धूसर होने से बहुत पहले, नुक़सानदेह स्तर पर भी दिखता नहीं। नज़ारा नहीं, आँकड़ा देखिए।",
    },
  },
  {
    myth: { en: "Early morning walks are the healthiest.", hi: "सुबह-सुबह की सैर सबसे सेहतमंद है।" },
    fact: {
      en: "In winter, dawn is often the dirtiest time of day: the night's cold lid hasn't lifted yet. Early afternoon is usually cleaner.",
      hi: "सर्दियों में भोर अक्सर दिन का सबसे ख़राब समय होती है: रात का ठंडा ढक्कन अभी हटा नहीं होता। दोपहर आमतौर पर ज़्यादा साफ़ होती है।",
    },
  },
  {
    myth: { en: "Indoors, we're safe.", hi: "घर के अंदर हम सुरक्षित हैं।" },
    fact: {
      en: "Outdoor smog seeps in through every gap, and cooking, incense and smoking add their own. Without filtration, indoor air tracks the air outside.",
      hi: "बाहर की धुंध हर दरार से अंदर आती है, और खाना पकाना, अगरबत्ती और धूम्रपान अपना धुआँ जोड़ते हैं। फ़िल्टर के बिना घर की हवा बाहर जैसी ही रहती है।",
    },
  },
  {
    myth: { en: "Pollution only matters for people who are already ill.", hi: "प्रदूषण सिर्फ़ बीमार लोगों के लिए मायने रखता है।" },
    fact: {
      en: "Healthy adults feel it too, and years of exposure shorten lives across a whole population. Delhi residents could gain 8.2 years of life with clean air.",
      hi: "स्वस्थ वयस्क भी इसे महसूस करते हैं, और सालों का संपर्क पूरी आबादी की उम्र घटाता है। साफ़ हवा से दिल्ली वाले 8.2 साल ज़्यादा जी सकते हैं।",
    },
  },
];

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
        gsap.to("[data-cta] img", {
          yPercent: 10,
          scale: 1.08,
          ease: "none",
          scrollTrigger: { trigger: "[data-cta]", start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      <PageHero photo={PHOTOS.crossingHaze} title={tx(copy.title)} lede={tx(copy.lede)} />

      {/* Size */}
      <section data-size aria-labelledby="size-heading" className="bg-haze text-ink">
        <div className="mx-auto grid max-w-[90rem] items-center gap-14 px-5 py-24 sm:px-8 md:py-32 lg:grid-cols-2">
          <div>
            <h2 id="size-heading" className="display text-[clamp(2.4rem,5vw,4.4rem)]">
              {tx(copy.sizeTitle)}
            </h2>
            <p className="lede mt-7 max-w-[50ch] text-ink-2">{tx(copy.sizeBody)}</p>
            <Cite source={SRC.epaPm} className="mt-5 inline-block text-ink-2" />
          </div>
          <figure className="m-0">
            <svg
              viewBox="0 0 420 300"
              className="h-auto w-full"
              role="img"
              aria-label={`${tx(copy.hair)}; ${tx(copy.pm10)}; ${tx(copy.pm25)}`}
            >
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
              <circle
                data-particle
                cx="330"
                cy="110"
                r="20"
                fill="var(--accent-soft)"
                stroke="var(--accent-text)"
                strokeWidth="1.5"
              />
              <circle data-particle cx="330" cy="200" r="5" fill="var(--accent-text)" />
            </svg>
            <figcaption className="mt-4 grid gap-1.5 text-sm text-ink-2 sm:grid-cols-3">
              <span>{tx(copy.hair)}</span>
              <span>{tx(copy.pm10)}</span>
              <span className="font-semibold text-ink">{tx(copy.pm25)}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Body */}
      <section aria-labelledby="body-heading" className="on-night bg-night text-white">
        <div className="mx-auto grid max-w-[90rem] gap-14 px-5 py-24 sm:px-8 md:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <h2 id="body-heading" className="display text-[clamp(2.4rem,5vw,4.4rem)] lg:sticky lg:top-28">
              {tx(copy.bodyTitle)}
            </h2>
          </div>
          <div>
            <dl className="m-0 grid">
              {BODY.map((b, i) => (
                <div key={i} className="grid gap-2 border-t border-white/15 py-9 md:grid-cols-[12rem_1fr] md:gap-10">
                  <dt className="font-display text-3xl">{tx(b.title)}</dt>
                  <dd className="m-0 max-w-[52ch] text-lg text-white/80">{tx(b.body)}</dd>
                </div>
              ))}
            </dl>
            <Cite source={SRC.soga2024} className="mt-4 inline-block text-mist-2" />
          </div>
        </div>
      </section>

      {/* AQI */}
      <section aria-labelledby="aqi-heading" className="bg-paper text-ink">
        <div className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 md:py-32">
          <h2 id="aqi-heading" className="display max-w-[18ch] text-[clamp(2.4rem,5vw,4.4rem)]">
            {tx(copy.aqiTitle)}
          </h2>
          <p className="lede mt-6 max-w-[56ch] text-ink-2">{tx(copy.aqiBody)}</p>
          <ol className="mt-14 grid list-none gap-0 p-0">
            {BANDS.map((b) => (
              <li
                key={b.id}
                className="grid items-center gap-x-8 gap-y-2 border-t border-line py-6 md:grid-cols-[9rem_16rem_1fr]"
              >
                <span className="font-display text-2xl tabular-nums">
                  {b.min}–{Number.isFinite(b.max) ? b.max : "500"}
                </span>
                <span className="inline-flex w-fit items-center gap-3 font-semibold">
                  <span aria-hidden="true" data-band-swatch className="size-4 rounded-full" style={{ background: b.color }} />
                  {t(`band.${b.id}` as MessageKey)}
                </span>
                <span className="max-w-[60ch] text-ink-2">{tx(BAND_ADVICE[b.id])}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Protect */}
      <section aria-labelledby="protect-heading" className="bg-haze text-ink">
        <div className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 md:py-32">
          <h2 id="protect-heading" className="display max-w-[18ch] text-[clamp(2.4rem,5vw,4.4rem)]">
            {tx(copy.protectTitle)}
          </h2>
          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-20">
            <EvidenceList heading={tx(copy.works)} items={WORKS} good />
            <EvidenceList heading={tx(copy.doesnt)} items={DOESNT} good={false} />
          </div>
        </div>
      </section>

      {/* Myths */}
      <section aria-labelledby="myth-heading" className="on-night bg-night-2 text-white">
        <div className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 md:py-32">
          <h2 id="myth-heading" className="display text-[clamp(2.4rem,5vw,4.4rem)]">
            {tx(copy.mythTitle)}
          </h2>
          <div className="mt-12 grid">
            {MYTHS.map((m, i) => (
              <details key={i} className="group border-t border-white/15 py-7 last:border-b">
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
        </div>
      </section>

      {/* CTA */}
      <section data-cta className="on-night relative isolate overflow-hidden bg-night text-white">
        <div className="absolute inset-0 -z-10">
          <Photo photo={PHOTOS.metro} className="h-full w-full" imgClassName="h-full w-full" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(15_19_26/0.92)_0%,rgb(15_19_26/0.55)_60%,rgb(15_19_26/0.3)_100%)]" />
        </div>
        <div className="mx-auto flex min-h-[80svh] max-w-[90rem] flex-col justify-center px-5 py-24 sm:px-8">
          <h2 className="display max-w-[16ch] text-[clamp(2.6rem,6vw,5.4rem)]">{tx(copy.ctaTitle)}</h2>
          <p className="lede mt-6 max-w-[46ch] text-white/85">{tx(copy.ctaBody)}</p>
          <Link to="/plan" className="btn btn-primary mt-10 min-h-13 w-fit px-7 text-lg">
            {tx(copy.cta)}
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function EvidenceList({
  heading,
  items,
  good,
}: {
  heading: string;
  items: { title: Bilingual; detail: Bilingual }[];
  good: boolean;
}) {
  const tx = useText();
  const Icon = good ? Check : X;
  return (
    <div>
      <h3 className="flex items-center gap-3 border-b-2 border-ink pb-4 text-xl font-semibold">
        <span className={`grid size-8 place-items-center rounded-full ${good ? "bg-ok text-paper" : "bg-ink text-paper"}`}>
          <Icon aria-hidden="true" size={16} strokeWidth={3} />
        </span>
        {heading}
      </h3>
      <ul className="grid">
        {items.map((it, i) => (
          <li key={i} className="grid gap-1.5 border-b border-line py-6">
            <span className="font-display text-2xl leading-snug">{tx(it.title)}</span>
            <span className="text-ink-2">{tx(it.detail)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
