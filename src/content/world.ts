/** World air page copy and sourced global statistics, in both languages. */
import type { Bilingual } from "../lib/types";
import { SRC, type Source } from "./text";

export const copy = {
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

export interface Fact {
  value: number;
  decimals: number;
  format: Bilingual;
  body: Bilingual;
  source: Source;
}

export const FACTS: Fact[] = [
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
