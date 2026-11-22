import { creditUrl, PHOTOS, profileUrl } from "../content/photos";
import { SRC, useText, type Bilingual } from "../content/text";
import { SOURCES } from "../lib/impact";
import { useApp } from "../state/AppState";
import { PageHero } from "../site/PageHero";
import { useSmoothScroll } from "../site/useSmoothScroll";

const copy = {
  title: { en: "Built for the hours that matter", hi: "उन घंटों के लिए, जो मायने रखते हैं" },
  lede: {
    en: "Shwaas is a clean-air planner for families. It runs entirely in your browser, asks for nothing it doesn't need, and shows its working.",
    hi: "श्वास परिवारों के लिए साफ़ हवा की योजना बनाने वाला साथी है। यह पूरी तरह आपके ब्राउज़र में चलता है, ज़रूरत से ज़्यादा कुछ नहीं माँगता, और अपना हिसाब दिखाता है।",
  },
  howTitle: { en: "How the plan is made", hi: "योजना कैसे बनती है" },
  privacyTitle: { en: "Your privacy", hi: "आपकी निजता" },
  dataTitle: { en: "Data and sources", hi: "डेटा और स्रोत" },
  a11yTitle: { en: "Accessibility", hi: "सुलभता" },
  photosTitle: { en: "Photography", hi: "तस्वीरें" },
  photosBody: {
    en: "All photographs are from Unsplash, used under the Unsplash License. Thank you to the photographers:",
    hi: "सभी तस्वीरें Unsplash से हैं, Unsplash लाइसेंस के तहत। फ़ोटोग्राफ़रों का धन्यवाद:",
  },
} satisfies Record<string, Bilingual>;

const HOW: Bilingual[] = [
  {
    en: "Shwaas reads the hourly forecast for your place from the Copernicus atmosphere model (via Open-Meteo), plus wind and how high the air can mix, which explain why smog gets trapped.",
    hi: "श्वास Copernicus वायुमंडल मॉडल (Open-Meteo के ज़रिए) से आपकी जगह का हर घंटे का पूर्वानुमान पढ़ता है, साथ ही हवा की रफ़्तार और हवा कितनी ऊँचाई तक मिल सकती है, जो बताते हैं कि धुंध क्यों फँसती है।",
  },
  {
    en: "Simple, checkable rules find the cleanest and dirtiest hours, the cigarette equivalent, and how much cleaner a moved workout would be.",
    hi: "सरल, जाँचे जा सकने वाले नियम सबसे साफ़ और सबसे ख़राब घंटे, सिगरेट के बराबर जोखिम, और व्यायाम का समय बदलने से कितनी साफ़ हवा मिलेगी, यह निकालते हैं।",
  },
  {
    en: "Google's Gemini writes the day plan for your household from those facts, choosing only from a vetted list of tips and swaps. Its answer is checked before you see it; if anything is off, the built-in planner takes over.",
    hi: "Google का Gemini इन तथ्यों से आपके घर के लिए दिन की योजना लिखता है, और सिर्फ़ जाँचे हुए सुझावों में से चुनता है। आपको दिखाने से पहले उसका जवाब जाँचा जाता है; कुछ गड़बड़ हो तो अंदरूनी प्लानर काम सँभाल लेता है।",
  },
  {
    en: "Every number on screen, from kilograms of CO₂ to percent less PM2.5, is calculated from published factors. The AI explains; it never invents a figure.",
    hi: "स्क्रीन का हर आँकड़ा, CO₂ के किलो से लेकर PM2.5 में कमी के प्रतिशत तक, प्रकाशित आँकड़ों से निकाला जाता है। AI समझाता है; कोई आँकड़ा गढ़ता नहीं।",
  },
];

const A11Y: Bilingual[] = [
  {
    en: "Shwaas aims to meet WCAG 2.2 at level AA. Every page and dialog is checked with axe-core in automated tests and in the browser, in light and dark themes.",
    hi: "श्वास का लक्ष्य WCAG 2.2 के AA स्तर को पूरा करना है। हर पेज और डायलॉग की जाँच axe-core से स्वचालित टेस्ट और ब्राउज़र में, हल्की और गहरी दोनों थीम में होती है।",
  },
  {
    en: "Everything works with a keyboard alone. Page changes move focus to the new heading, and live updates are announced to screen readers.",
    hi: "सब कुछ सिर्फ़ कीबोर्ड से चलता है। पेज बदलने पर फ़ोकस नए शीर्षक पर जाता है, और लाइव बदलाव स्क्रीन रीडर को बताए जाते हैं।",
  },
  {
    en: "Air quality is never shown by colour alone: every reading has a text label, and every chart has a table of its numbers.",
    hi: "हवा की गुणवत्ता कभी सिर्फ़ रंग से नहीं दिखाई जाती: हर आँकड़े के साथ लिखा हुआ स्तर है, और हर चार्ट के आँकड़ों की तालिका है।",
  },
  {
    en: "Your device settings are respected: reduced motion turns animation off, and increased contrast, high-contrast mode, dark mode and text zoom are all supported.",
    hi: "आपके डिवाइस की सेटिंग्स का सम्मान होता है: कम मोशन चुनने पर एनिमेशन बंद हो जाता है, और ज़्यादा कंट्रास्ट, हाई-कंट्रास्ट मोड, डार्क मोड और बड़ा टेक्स्ट सब काम करते हैं।",
  },
  {
    en: "The whole site is available in Hindi, and the daily plan prints cleanly for anyone who prefers paper.",
    hi: "पूरी साइट हिंदी में उपलब्ध है, और रोज़ की योजना काग़ज़ पसंद करने वालों के लिए साफ़ प्रिंट होती है।",
  },
];

const PRIVACY: Bilingual[] = [
  {
    en: "There is no Shwaas server and no account. Nothing about you is stored anywhere but this device.",
    hi: "श्वास का कोई सर्वर या अकाउंट नहीं है। आपकी कोई जानकारी इस डिवाइस के अलावा कहीं नहीं रखी जाती।",
  },
  {
    en: "Your location is rounded to about a kilometre before any request leaves your device.",
    hi: "कोई भी अनुरोध डिवाइस से बाहर जाने से पहले आपकी लोकेशन लगभग एक किलोमीटर तक गोल की जाती है।",
  },
  {
    en: "Household details are sent only as part of the question to Gemini, as simple categories, never your name.",
    hi: "घर की जानकारी सिर्फ़ Gemini को भेजे गए सवाल में, सरल श्रेणियों के रूप में जाती है, आपका नाम कभी नहीं।",
  },
  {
    en: "Settings has one button that deletes everything Shwaas saved on this device.",
    hi: "सेटिंग्स में एक बटन है जो श्वास का इस डिवाइस पर सहेजा सब कुछ मिटा देता है।",
  },
];

export default function AboutPage() {
  useSmoothScroll();
  const tx = useText();
  const { lang } = useApp();
  const extra = [
    SRC.who2022,
    SRC.soga2024,
    SRC.whoHousehold,
    SRC.aqli2025,
    SRC.iqair2024,
    SRC.stubble,
    SRC.epaPm,
    SRC.whoGuidelines,
  ];

  return (
    <div>
      <PageHero photo={PHOTOS.cyclist} title={tx(copy.title)} lede={tx(copy.lede)} />

      <div className="bg-paper text-ink">
        <div className="mx-auto grid max-w-[90rem] gap-20 px-5 py-24 sm:px-8 md:py-32">
          <Block id="how" title={tx(copy.howTitle)}>
            <ol className="m-0 grid list-none gap-0 p-0">
              {HOW.map((h, i) => (
                <li key={i} className="grid gap-3 border-t border-line py-7 md:grid-cols-[4rem_1fr]">
                  <span className="font-display text-2xl text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                  <p className="max-w-[64ch] text-lg">{tx(h)}</p>
                </li>
              ))}
            </ol>
          </Block>

          <Block id="privacy" title={tx(copy.privacyTitle)}>
            <ul className="m-0 grid list-none gap-0 p-0">
              {PRIVACY.map((h, i) => (
                <li key={i} className="border-t border-line py-6 text-lg">
                  {tx(h)}
                </li>
              ))}
            </ul>
          </Block>

          <Block id="a11y" title={tx(copy.a11yTitle)}>
            <ul className="m-0 grid list-none gap-0 p-0">
              {A11Y.map((h, i) => (
                <li key={i} className="border-t border-line py-6 text-lg">
                  {tx(h)}
                </li>
              ))}
            </ul>
          </Block>

          <Block id="data" title={tx(copy.dataTitle)}>
            <ul className="m-0 grid list-disc gap-2.5 pl-5 text-ink-2">
              <li>
                <a
                  className="underline underline-offset-4"
                  href="https://open-meteo.com/en/docs/air-quality-api"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open-Meteo Air Quality API
                </a>{" "}
                (Copernicus Atmosphere Monitoring Service)
              </li>
              {extra.map((s) => (
                <li key={s.url}>
                  <a className="underline underline-offset-4" href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
              {SOURCES.map((s) => (
                <li key={s.id}>{s.label}</li>
              ))}
            </ul>
          </Block>

          <Block id="photos" title={tx(copy.photosTitle)}>
            <p className="max-w-[60ch] text-lg text-ink-2">{tx(copy.photosBody)}</p>
            <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(PHOTOS).map((p) => (
                <li key={p.id} className="text-sm">
                  <a href={creditUrl(p)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    {p.alt[lang]}
                  </a>{" "}
                  <span className="text-ink-2">
                    by{" "}
                    <a href={profileUrl(p)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      @{p.by}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
      <h2 id={`${id}-heading`} className="display text-[clamp(2rem,3.6vw,3.2rem)]">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
