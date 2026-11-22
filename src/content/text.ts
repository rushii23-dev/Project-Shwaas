import { useApp } from "../state/AppState";
import type { Bilingual } from "../lib/types";

/** Long-form story copy is written in both languages side by side. */
export type { Bilingual };

/** `const tx = useText(); tx(copy.title)` picks the current language. */
export function useText() {
  const { lang } = useApp();
  return (b: Bilingual) => b[lang];
}

export interface Source {
  label: string;
  url: string;
}

/** Every statistic on the site carries one of these. */
export const SRC = {
  who2022: {
    label: "WHO, Billions of people still breathe unhealthy air (2022)",
    url: "https://www.who.int/news/item/04-04-2022-billions-of-people-still-breathe-unhealthy-air-new-who-data",
  },
  soga2024: {
    label: "State of Global Air 2024 (HEI and IHME, with UNICEF)",
    url: "https://www.stateofglobalair.org/resources/report/state-global-air-report-2024",
  },
  whoHousehold: {
    label: "WHO fact sheet: Household air pollution and health",
    url: "https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health",
  },
  aqli2025: { label: "Air Quality Life Index 2025, EPIC, University of Chicago", url: "https://aqli.epic.uchicago.edu/" },
  iqair2024: {
    label: "IQAir World Air Quality Report 2024, via Down To Earth",
    url: "https://www.downtoearth.org.in/environment/no-surprises-as-delhi-continues-to-be-most-polluted-capital-13-out-of-20-most-polluted-cities-found-in-india",
  },
  stubble: {
    label: "CSE India, Beyond the burn: Delhi's winter smog (2025)",
    url: "https://www.cseindia.org/beyond-the-burn-delhi-s-winter-smog-intensifies-even-after-stubble-fires-fade-12982",
  },
  epaPm: {
    label: "US EPA, Particulate Matter (PM) Basics",
    url: "https://www.epa.gov/pm-pollution/particulate-matter-pm-basics",
  },
  whoGuidelines: {
    label: "WHO Global Air Quality Guidelines (2021)",
    url: "https://www.who.int/publications/i/item/9789240034228",
  },
} satisfies Record<string, Source>;
