/**
 * Rule-based day planner. It produces the same `Plan` shape as the AI, from
 * the deterministic insights, so the app is fully useful offline, without a
 * key, or when the model is rate-limited. It is also the safety net the AI
 * result is checked against.
 */
import { applicableIndoor, applicableSwaps } from "./catalog";
import { fmtHour, hhmm } from "./format";
import type { DayInsights, Driver } from "./insights";
import type { Lang, Plan, Profile, RoutineItem } from "./types";

type T = Record<Lang, string>;
const pick = (t: T, lang: Lang) => t[lang];

const DRIVER_TEXT: Record<Driver, T> = {
  low_wind: { en: "There is almost no wind to carry the smog away.", hi: "हवा लगभग नहीं चल रही, इसलिए धुंध कहीं नहीं जा रही।" },
  inversion: {
    en: "After dark a cold layer of air caps the city, trapping smoke from traffic, cooking and burning close to the ground.",
    hi: "रात में ठंडी हवा की परत शहर को ढक लेती है, जिससे ट्रैफ़िक, खाना पकाने और जलाने का धुआँ ज़मीन के पास फँस जाता है।",
  },
  dust: { en: "Coarse dust from construction and roads makes up a big share.", hi: "निर्माण और सड़कों की मोटी धूल का बड़ा हिस्सा है।" },
  combustion: {
    en: "Most of it is fine smoke from burning: vehicles, stubble, waste and wood.",
    hi: "ज़्यादातर यह जलने से निकला बारीक धुआँ है: गाड़ियाँ, पराली, कचरा और लकड़ी।",
  },
};

export function explainWhy(ins: DayInsights, lang: Lang): string {
  if (ins.drivers.length === 0) {
    return pick(
      { en: "Wind and mixing are keeping pollution from building up today.", hi: "आज हवा और मौसम प्रदूषण को जमा होने से रोक रहे हैं।" },
      lang,
    );
  }
  return ins.drivers.map((d) => pick(DRIVER_TEXT[d], lang)).join(" ");
}

export function headlineFor(ins: DayInsights, lang: Lang): string {
  const best = ins.best2h ? fmtHour(ins.best2h.start.hour, lang) : null;
  switch (ins.risk) {
    case "ok":
      return pick(
        {
          en: "A good day to be outside. Open the windows and let fresh air in.",
          hi: "बाहर रहने के लिए अच्छा दिन। खिड़कियाँ खोलें और ताज़ी हवा आने दें।",
        },
        lang,
      );
    case "caution":
      return best
        ? pick(
            {
              en: `Mostly fine outside. The cleanest stretch starts around ${best}.`,
              hi: `बाहर ज़्यादातर ठीक है। सबसे साफ़ हवा ${best} के आसपास शुरू होगी।`,
            },
            lang,
          )
        : pick(
            {
              en: "Mostly fine outside. Sensitive family members should take it easy.",
              hi: "बाहर ज़्यादातर ठीक है। संवेदनशील सदस्य सावधानी रखें।",
            },
            lang,
          );
    case "limit":
      return best
        ? pick(
            { en: `Keep outdoor time short, and fit it in around ${best}.`, hi: `बाहर कम समय बिताएँ, और वह ${best} के आसपास रखें।` },
            lang,
          )
        : pick({ en: "Keep outdoor time short and windows shut.", hi: "बाहर कम समय बिताएँ और खिड़कियाँ बंद रखें।" }, lang);
    case "avoid":
      return pick(
        {
          en: "Stay in where you can. Today is a windows-shut, mask-on day.",
          hi: "जहाँ हो सके घर में रहें। आज खिड़कियाँ बंद और मास्क पहनने का दिन है।",
        },
        lang,
      );
  }
}

/** Build the routine for the next waking day from the household's habits. */
export function buildRoutine(ins: DayInsights, p: Profile, lang: Lang): RoutineItem[] {
  const items: RoutineItem[] = [];
  const add = (time: string, kind: RoutineItem["kind"], title: T, detail: T, impact?: T) =>
    items.push({
      time,
      kind,
      title: pick(title, lang),
      detail: pick(detail, lang),
      ...(impact ? { impact: pick(impact, lang) } : {}),
    });
  const bad = ins.risk === "limit" || ins.risk === "avoid";
  const best = ins.best2h;
  const bestAt = best ? fmtHour(best.start.hour, lang) : "";

  if (p.activities.includes("morning_exercise")) {
    if (ins.exerciseShift) {
      const s = ins.exerciseShift;
      add(
        hhmm(s.to.start.hour),
        "outdoor",
        { en: `Move your workout to ${bestAt}`, hi: `व्यायाम ${bestAt} पर करें` },
        {
          en: "Early morning is when smog sits lowest. Exercise later, or do yoga indoors at dawn.",
          hi: "सुबह-सुबह धुंध सबसे नीचे होती है। बाद में व्यायाम करें, या सुबह घर में योग करें।",
        },
        {
          en: `You breathe about ${s.cutPct}% less PM2.5 during the workout.`,
          hi: `व्यायाम के दौरान लगभग ${s.cutPct}% कम PM2.5 साँस में जाएगा।`,
        },
      );
    } else if (bad) {
      add(
        "06:30",
        "indoor",
        { en: "Work out indoors today", hi: "आज घर के अंदर व्यायाम करें" },
        {
          en: "Hard exercise makes you breathe 3–5 times more air. Do yoga or a home workout with windows shut.",
          hi: "तेज़ व्यायाम में 3–5 गुना ज़्यादा हवा साँस में जाती है। खिड़कियाँ बंद करके योग या घर पर व्यायाम करें।",
        },
      );
    } else {
      add(
        "07:00",
        "outdoor",
        { en: "Morning walk is fine", hi: "सुबह की सैर ठीक है" },
        { en: "Stay on parks and side lanes, away from main roads.", hi: "पार्क और गलियों में चलें, मुख्य सड़कों से दूर।" },
      );
    }
  }

  if (p.activities.includes("school_run")) {
    add(
      "07:30",
      "commute",
      { en: "School run with masks on", hi: "स्कूल जाते समय मास्क पहनाएँ" },
      bad
        ? {
            en: "Fitted N95s for the children, and a route through side streets. Drop off quickly instead of waiting at the gate.",
            hi: "बच्चों को फ़िट N95 पहनाएँ और गलियों वाला रास्ता लें। गेट पर रुकने की बजाय जल्दी छोड़ें।",
          }
        : {
            en: "Take the quieter route; traffic-heavy roads carry the most exhaust at this hour.",
            hi: "शांत रास्ता लें; इस समय भीड़ वाली सड़कों पर सबसे ज़्यादा धुआँ होता है।",
          },
    );
  }

  if (p.commute.mode !== "wfh") {
    const car = p.commute.mode.startsWith("car_");
    add(
      "09:00",
      "commute",
      { en: "Commute", hi: "दफ़्तर का सफ़र" },
      car
        ? {
            en: "Windows up, air on recirculation. Switch the engine off at long red lights.",
            hi: "शीशे बंद, एसी रीसर्कुलेशन पर। लंबी रेड लाइट पर इंजन बंद करें।",
          }
        : bad
          ? {
              en: "Wear an N95 for the whole ride, and take the metro if it is an option today.",
              hi: "पूरे सफ़र में N95 पहनें, और आज हो सके तो मेट्रो लें।",
            }
          : {
              en: "A normal commute day. Keep an N95 in your bag in case it turns.",
              hi: "आज सामान्य सफ़र है। हवा बिगड़ने के लिए बैग में N95 रखें।",
            },
    );
  }

  if (best) {
    add(
      hhmm(best.start.hour),
      "home",
      { en: "Air out the house for 15 minutes", hi: "15 मिनट के लिए घर की खिड़कियाँ खोलें" },
      {
        en: `This is the cleanest stretch of the day (AQI about ${best.avgAqi}). Open opposite windows for a cross-breeze, then close up.`,
        hi: `यह दिन का सबसे साफ़ समय है (AQI लगभग ${best.avgAqi})। आमने-सामने की खिड़कियाँ खोलें, फिर बंद कर दें।`,
      },
    );
  }

  if (p.activities.includes("kids_play")) {
    const ok = best && best.avgAqi <= 150;
    add(
      best ? hhmm(best.start.hour) : "16:00",
      ok ? "outdoor" : "indoor",
      ok
        ? { en: `Outdoor play around ${bestAt}`, hi: `${bestAt} के आसपास बाहर खेलें` }
        : { en: "Indoor play today", hi: "आज घर के अंदर खेलें" },
      ok
        ? { en: "Keep it to an hour of easy play, away from roads.", hi: "सड़क से दूर, एक घंटे तक हल्का खेल रखें।" }
        : {
            en: "Children breathe more air for their size. Board games, dancing or a building's indoor hall instead.",
            hi: "बच्चे अपने आकार के हिसाब से ज़्यादा हवा साँस में लेते हैं। बोर्ड गेम, डांस या सोसाइटी का हॉल बेहतर है।",
          },
    );
  }

  if (ins.worst3h) {
    const w = ins.worst3h;
    add(
      hhmm(w.start.hour),
      "home",
      { en: "Shut windows and doors", hi: "खिड़कियाँ और दरवाज़े बंद करें" },
      {
        en: `Smog peaks from ${fmtHour(w.start.hour, "en")} to ${fmtHour(w.end.hour + 1, "en")} (AQI about ${w.avgAqi}). ${p.purifier ? "Run the purifier on high." : "Run a fan-and-filter box if you have one."}`,
        hi: `${fmtHour(w.start.hour, "hi")} से ${fmtHour(w.end.hour + 1, "hi")} तक धुंध सबसे ज़्यादा है (AQI लगभग ${w.avgAqi})। ${p.purifier ? "प्यूरीफ़ायर तेज़ चलाएँ।" : "अगर फ़िल्टर वाला पंखा है तो चलाएँ।"}`,
      },
    );
  }

  if (p.activities.includes("evening_walk")) {
    const eveningBad = ins.worst3h !== null && ins.worst3h.start.hour >= 17;
    add(
      "18:30",
      eveningBad ? "indoor" : "outdoor",
      eveningBad ? { en: "Skip the evening walk", hi: "शाम की सैर छोड़ें" } : { en: "Evening walk", hi: "शाम की सैर" },
      eveningBad
        ? {
            en: "Evenings are when smog builds fastest. Walk in the afternoon window instead, or indoors.",
            hi: "शाम को धुंध सबसे तेज़ी से बढ़ती है। दोपहर के साफ़ समय में या घर में टहलें।",
          }
        : { en: "Keep to quieter streets and parks.", hi: "शांत गलियों और पार्कों में चलें।" },
    );
  }

  add(
    "19:30",
    "home",
    { en: "Cook with the lid on and exhaust running", hi: "ढक्कन लगाकर और एग्ज़ॉस्ट चलाकर पकाएँ" },
    {
      en: "Frying and tadka spike indoor PM2.5 more than anything else in the day.",
      hi: "तलना और तड़का दिन में घर का PM2.5 सबसे ज़्यादा बढ़ाते हैं।",
    },
  );

  add(
    "21:30",
    "health",
    p.purifier
      ? { en: "Purifier on in the bedroom", hi: "बेडरूम में प्यूरीफ़ायर चालू करें" }
      : { en: "Seal the bedroom for the night", hi: "रात के लिए बेडरूम बंद करें" },
    p.purifier
      ? {
          en: "Door closed, on high for an hour, then auto. Sleep is a third of the day's breathing.",
          hi: "दरवाज़ा बंद, एक घंटा तेज़, फिर ऑटो। नींद दिन की एक-तिहाई साँसें हैं।",
        }
      : {
          en: "Close the door and put a rolled towel along the gap underneath.",
          hi: "दरवाज़ा बंद करें और नीचे की दरार पर लपेटा तौलिया रखें।",
        },
  );

  if (p.sensitive.includes("respiratory") || p.sensitive.includes("heart")) {
    add(
      "08:00",
      "health",
      { en: "Keep medicines within reach", hi: "दवाइयाँ पास रखें" },
      {
        en: "Inhalers and heart medicines handy today. Watch for coughing, wheezing or chest tightness.",
        hi: "आज इनहेलर और दिल की दवाइयाँ पास रखें। खाँसी, साँस फूलने या सीने में जकड़न पर ध्यान दें।",
      },
    );
  }

  return sortFromNow(items, ins.nowHour);
}

/** Minutes from `nowHour` until `time`, wrapping past midnight into tomorrow. */
export function minutesFromNow(time: string, nowHour: number): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return ((((h - nowHour) * 60 + m) % 1440) + 1440) % 1440;
}

/** Order a routine as the next 24 hours will actually unfold. */
export function sortFromNow(items: RoutineItem[], nowHour: number): RoutineItem[] {
  return items.toSorted((a, b) => minutesFromNow(a.time, nowHour) - minutesFromNow(b.time, nowHour));
}

/** Rank catalogue items by relevance: high-impact, household-specific ones first. */
export const INDOOR_PRIORITY = [
  "no_smoking_indoors",
  "purifier_bedroom",
  "diy_purifier",
  "windows_timed",
  "n95_outdoors",
  "no_coils_incense",
  "kitchen_exhaust",
  "car_recirculate",
  "seal_gaps",
  "wet_clean",
];
export const SWAP_PRIORITY = [
  "cooking_lpg",
  "heating_safe",
  "commute_metro",
  "carpool",
  "wfh_bad_days",
  "commute_bus",
  "engine_off",
  "short_trips_walk",
  "compost_not_burn",
  "share_advisory",
  "report_burning",
];

const rank = (order: string[]) => (a: { id: string }, b: { id: string }) => order.indexOf(a.id) - order.indexOf(b.id);

export function buildFallbackPlan(ins: DayInsights, p: Profile, lang: Lang, now = Date.now()): Plan {
  return {
    source: "rules",
    generatedAt: now,
    headline: headlineFor(ins, lang),
    why: explainWhy(ins, lang),
    routine: buildRoutine(ins, p, lang),
    indoor: applicableIndoor(p)
      .toSorted(rank(INDOOR_PRIORITY))
      .slice(0, 6)
      .map((h) => ({ id: h.id, reason: h.body[lang] })),
    swaps: applicableSwaps(p)
      .toSorted(rank(SWAP_PRIORITY))
      .slice(0, 6)
      .map((s) => ({ id: s.id, reason: s.body[lang] })),
  };
}
