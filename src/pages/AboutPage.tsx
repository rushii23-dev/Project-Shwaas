import type { ReactNode } from "react";
import { A11Y, copy, HOW, PRIVACY, STORY_SOURCES } from "../content/about";
import { creditUrl, PHOTOS, profileUrl } from "../content/photos";
import { useText, type Bilingual } from "../content/text";
import { SOURCES } from "../lib/impact";
import { useApp } from "../state/AppState";
import { ExternalLink } from "../site/ExternalLink";
import { PageHero } from "../site/PageHero";
import { COLUMN } from "../site/Section";
import { useSmoothScroll } from "../site/useSmoothScroll";

const LINK = "underline underline-offset-4";

export default function AboutPage() {
  useSmoothScroll();
  const tx = useText();
  const { lang } = useApp();

  return (
    <div>
      <PageHero photo={PHOTOS.cyclist} title={tx(copy.title)} lede={tx(copy.lede)} />

      <div className="bg-paper text-ink">
        <div className={`${COLUMN} grid gap-20 py-24 md:py-32`}>
          <Block id="how" title={tx(copy.howTitle)}>
            <ol className="m-0 grid list-none gap-0 p-0">
              {HOW.map((h, i) => (
                <li key={h.en} className="grid gap-3 border-t border-line py-7 md:grid-cols-[4rem_1fr]">
                  <span className="font-display text-2xl text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                  <p className="max-w-[64ch] text-lg">{tx(h)}</p>
                </li>
              ))}
            </ol>
          </Block>

          <Block id="privacy" title={tx(copy.privacyTitle)}>
            <Statements items={PRIVACY} />
          </Block>

          <Block id="a11y" title={tx(copy.a11yTitle)}>
            <Statements items={A11Y} />
          </Block>

          <Block id="data" title={tx(copy.dataTitle)}>
            <ul className="m-0 grid list-disc gap-2.5 pl-5 text-ink-2">
              <li>
                <ExternalLink className={LINK} href="https://open-meteo.com/en/docs/air-quality-api">
                  Open-Meteo Air Quality API
                </ExternalLink>{" "}
                (Copernicus Atmosphere Monitoring Service)
              </li>
              {STORY_SOURCES.map((s) => (
                <li key={s.url}>
                  <ExternalLink className={LINK} href={s.url}>
                    {s.label}
                  </ExternalLink>
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
                  <ExternalLink className={LINK} href={creditUrl(p)}>
                    {p.alt[lang]}
                  </ExternalLink>{" "}
                  <span className="text-ink-2">
                    by{" "}
                    <ExternalLink className={LINK} href={profileUrl(p)}>
                      @{p.by}
                    </ExternalLink>
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

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
      <h2 id={`${id}-heading`} className="display text-[clamp(2rem,3.6vw,3.2rem)]">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Statements({ items }: { items: readonly Bilingual[] }) {
  const tx = useText();
  return (
    <ul className="m-0 grid list-none gap-0 p-0">
      {items.map((h) => (
        <li key={h.en} className="border-t border-line py-6 text-lg">
          {tx(h)}
        </li>
      ))}
    </ul>
  );
}
