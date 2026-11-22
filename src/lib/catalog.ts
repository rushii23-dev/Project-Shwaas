/**
 * The vetted library of indoor hacks and low-emission swaps.
 *
 * The AI may only recommend items from this catalogue (by id), which keeps
 * advice safe and lets the impact engine attach real numbers. Each entry says
 * when it applies, so a family with an LPG stove never hears "switch to LPG".
 */
import { burningAvoided, commuteSwitch, idlingSavings, type SwapImpact, SOURCES } from "./impact";
import type { Lang, Profile } from "./types";

export type Bilingual = Record<Lang, string>;
type SourceId = (typeof SOURCES)[number]["id"];

export interface IndoorHack {
  id: string;
  title: Bilingual;
  body: Bilingual;
  effort: "low" | "medium" | "high";
  cost: "free" | "low" | "medium";
  /** Typical reduction in PM2.5, % range, when the study measured one. */
  cut: [number, number] | null;
  /** What the reduction applies to. Defaults to indoor air. */
  cutKind?: "indoor" | "mask" | "cabin";
  source?: SourceId;
  applies: (p: Profile) => boolean;
}

export interface Swap {
  id: string;
  title: Bilingual;
  body: Bilingual;
  scope: "personal" | "home" | "community";
  applies: (p: Profile) => boolean;
  impact: (p: Profile) => SwapImpact;
  source?: SourceId;
}

const always = () => true;
const drives = (p: Profile) => p.commute.mode.startsWith("car_");
const motorised = (p: Profile) => ["car_petrol", "car_diesel", "car_cng", "two_wheeler", "auto"].includes(p.commute.mode);
const dirtyFuel = (p: Profile) => ["biomass", "kerosene", "coal"].includes(p.cooking);

export const INDOOR: readonly IndoorHack[] = [
  {
    id: "purifier_bedroom",
    title: { en: "Run the purifier where you sleep", hi: "जहाँ सोते हैं, वहाँ प्यूरीफ़ायर चलाएँ" },
    body: {
      en: "Close the bedroom door and run it on high for an hour before bed, then on auto overnight. Eight hours of sleep is a third of the day's breathing.",
      hi: "सोने से एक घंटा पहले बेडरूम का दरवाज़ा बंद करके इसे तेज़ चलाएँ, फिर रात भर ऑटो पर रखें। नींद के आठ घंटे दिन की एक-तिहाई साँसें हैं।",
    },
    effort: "low",
    cost: "free",
    cut: [50, 80],
    source: "purifier-rct",
    applies: (p) => p.purifier,
  },
  {
    id: "diy_purifier",
    title: { en: "Build a fan-and-filter purifier", hi: "पंखे और फ़िल्टर से प्यूरीफ़ायर बनाएँ" },
    body: {
      en: "Tape a HEPA or MERV-13 filter to the back of a box or pedestal fan, arrows pointing toward the fan. It costs a fraction of a purifier and cleans a small room well.",
      hi: "बॉक्स या पेडस्टल पंखे के पीछे HEPA या MERV-13 फ़िल्टर टेप से लगाएँ, तीर पंखे की ओर। यह प्यूरीफ़ायर से बहुत सस्ता है और छोटे कमरे को अच्छी तरह साफ़ करता है।",
    },
    effort: "medium",
    cost: "low",
    cut: [40, 60],
    source: "cr-box",
    applies: (p) => !p.purifier,
  },
  {
    id: "windows_timed",
    title: { en: "Air out only in the clean window", hi: "सिर्फ़ साफ़ समय में खिड़कियाँ खोलें" },
    body: {
      en: "Keep windows shut through the smoggy hours and open them wide for 10–15 minutes when the forecast dips. Fresh air without letting the smog settle in.",
      hi: "धुंध वाले घंटों में खिड़कियाँ बंद रखें और जब हवा थोड़ी साफ़ हो, 10–15 मिनट के लिए पूरी खोलें। ताज़ी हवा आए, पर धुंध अंदर न बैठे।",
    },
    effort: "low",
    cost: "free",
    cut: [20, 35],
    applies: always,
  },
  {
    id: "no_coils_incense",
    title: { en: "Skip mosquito coils and agarbatti indoors", hi: "घर के अंदर मच्छर कॉइल और अगरबत्ती न जलाएँ" },
    body: {
      en: "One burning coil gives off as much fine smoke as dozens of cigarettes. Use a net or a plug-in liquid repellent instead.",
      hi: "एक जलती कॉइल दर्जनों सिगरेट जितना बारीक धुआँ छोड़ती है। इसकी जगह मच्छरदानी या प्लग-इन लिक्विड इस्तेमाल करें।",
    },
    effort: "low",
    cost: "free",
    cut: null,
    source: "coils",
    applies: always,
  },
  {
    id: "kitchen_exhaust",
    title: { en: "Lid on, exhaust on while cooking", hi: "पकाते समय ढक्कन लगाएँ, एग्ज़ॉस्ट चलाएँ" },
    body: {
      en: "Frying and tadka make the biggest indoor PM spikes of the day. Cover pans, run the chimney or exhaust fan, and keep the kitchen door shut.",
      hi: "तलना और तड़का घर में दिन का सबसे ज़्यादा धुआँ बनाते हैं। बर्तन ढकें, चिमनी या एग्ज़ॉस्ट चलाएँ और रसोई का दरवाज़ा बंद रखें।",
    },
    effort: "low",
    cost: "free",
    cut: [30, 60],
    applies: always,
  },
  {
    id: "wet_clean",
    title: { en: "Mop and dust damp, don't sweep dry", hi: "सूखी झाड़ू की जगह गीला पोंछा लगाएँ" },
    body: {
      en: "A dry broom throws settled dust back into the air you breathe. A damp cloth and mop trap it instead.",
      hi: "सूखी झाड़ू जमी धूल को फिर हवा में उड़ा देती है। गीला कपड़ा और पोंछा उसे पकड़ लेते हैं।",
    },
    effort: "low",
    cost: "free",
    cut: [10, 20],
    applies: always,
  },
  {
    id: "seal_gaps",
    title: { en: "Seal the gaps under doors and windows", hi: "दरवाज़ों और खिड़कियों की दरारें बंद करें" },
    body: {
      en: "A rolled towel or a ₹100 door sweep stops smog seeping in all night, and makes a purifier work far better.",
      hi: "एक लपेटा तौलिया या ₹100 का डोर-स्वीप रात भर धुंध को अंदर आने से रोकता है, और प्यूरीफ़ायर बेहतर काम करता है।",
    },
    effort: "low",
    cost: "low",
    cut: [10, 25],
    applies: always,
  },
  {
    id: "no_smoking_indoors",
    title: { en: "Take smoking outside, always", hi: "धूम्रपान हमेशा बाहर करें" },
    body: {
      en: "Indoor smoking is the largest single source of PM2.5 in a home, and children breathe it most. This one change outweighs every other tip here.",
      hi: "घर में धूम्रपान PM2.5 का सबसे बड़ा स्रोत है, और बच्चे इसे सबसे ज़्यादा साँस में लेते हैं। यह एक बदलाव बाकी सभी सुझावों से ज़्यादा असर करता है।",
    },
    effort: "medium",
    cost: "free",
    cut: [50, 90],
    applies: (p) => p.smokingIndoors,
  },
  {
    id: "n95_outdoors",
    title: { en: "Wear a fitted N95 outside", hi: "बाहर ठीक से फ़िट N95 पहनें" },
    body: {
      en: "A well-sealed N95 or FFP2 filters at least 95% of fine particles. Cloth and loose surgical masks do very little against smog.",
      hi: "अच्छी तरह फ़िट N95 या FFP2 कम से कम 95% बारीक कण रोकता है। कपड़े या ढीले सर्जिकल मास्क धुंध पर बहुत कम असर करते हैं।",
    },
    effort: "low",
    cost: "low",
    cut: [90, 95],
    cutKind: "mask",
    applies: always,
  },
  {
    id: "car_recirculate",
    title: { en: "Drive on air recirculation", hi: "गाड़ी में एयर रीसर्कुलेशन चलाएँ" },
    body: {
      en: "Windows up and recirculation on keeps traffic exhaust out of the cabin. Change the cabin filter every winter.",
      hi: "शीशे बंद और रीसर्कुलेशन चालू रखने से ट्रैफ़िक का धुआँ अंदर नहीं आता। हर सर्दी केबिन फ़िल्टर बदलें।",
    },
    effort: "low",
    cost: "free",
    cut: [40, 70],
    cutKind: "cabin",
    applies: drives,
  },
];

export const SWAPS: readonly Swap[] = [
  {
    id: "commute_metro",
    title: { en: "Take the metro for your commute", hi: "दफ़्तर मेट्रो से जाएँ" },
    body: {
      en: "Cuts tailpipe and road-dust emissions, and you breathe filtered air for most of the ride instead of traffic exhaust.",
      hi: "धुएँ और सड़क की धूल का उत्सर्जन घटता है, और सफ़र में ट्रैफ़िक के धुएँ की जगह फ़िल्टर की हुई हवा मिलती है।",
    },
    scope: "personal",
    applies: motorised,
    impact: (p) => commuteSwitch(p, "metro"),
    source: "india-ghg",
  },
  {
    id: "commute_bus",
    title: { en: "Switch to the bus", hi: "बस से जाएँ" },
    body: {
      en: "One bus replaces dozens of cars at a junction. Per passenger, emissions fall by more than 80%.",
      hi: "एक बस चौराहे पर दर्जनों गाड़ियों की जगह लेती है। प्रति यात्री उत्सर्जन 80% से ज़्यादा घटता है।",
    },
    scope: "personal",
    applies: motorised,
    impact: (p) => commuteSwitch(p, "bus"),
    source: "india-ghg",
  },
  {
    id: "carpool",
    title: { en: "Carpool with one neighbour", hi: "एक पड़ोसी के साथ कारपूल करें" },
    body: {
      en: "Sharing the same drive halves the emissions each of you is responsible for, and halves the fuel bill.",
      hi: "एक ही सफ़र साझा करने से हर व्यक्ति का उत्सर्जन आधा हो जाता है, और पेट्रोल का खर्च भी।",
    },
    scope: "community",
    applies: drives,
    impact: (p) => {
      const full = commuteSwitch(p, "wfh");
      return { co2KgWeek: (full.co2KgWeek ?? 0) / 2, pmGWeek: (full.pmGWeek ?? 0) / 2 };
    },
    source: "india-ghg",
  },
  {
    id: "wfh_bad_days",
    title: { en: "Work from home on severe days", hi: "बहुत ख़राब हवा वाले दिन घर से काम करें" },
    body: {
      en: "Skipping one commute a week, on the worst-air day, removes your trip from the road exactly when the city can least afford it.",
      hi: "हफ़्ते में एक दिन, सबसे ख़राब हवा वाले दिन, सफ़र छोड़ने से आपकी गाड़ी तब सड़क से हटती है जब शहर को इसकी सबसे ज़्यादा ज़रूरत है।",
    },
    scope: "personal",
    applies: (p) => motorised(p) && p.commute.daysPerWeek >= 3,
    impact: (p) => ({
      ...commuteSwitch(p, "wfh", Math.max(0, p.commute.km) * 2),
      // One of N commuting days skipped.
      doseCutPct: Math.round(100 / Math.max(1, p.commute.daysPerWeek)),
    }),
    source: "india-ghg",
  },
  {
    id: "engine_off",
    title: { en: "Engine off at red lights", hi: "रेड लाइट पर इंजन बंद करें" },
    body: {
      en: "Any stop longer than 10 seconds uses more fuel idling than restarting. Ten minutes of idling a day adds up fast.",
      hi: "10 सेकंड से लंबे रुकने पर इंजन चालू रखना दोबारा स्टार्ट करने से ज़्यादा ईंधन जलाता है। रोज़ दस मिनट का आइडलिंग जल्दी जुड़ जाता है।",
    },
    scope: "personal",
    applies: drives,
    impact: (p) => idlingSavings(10, p.commute.daysPerWeek),
  },
  {
    id: "short_trips_walk",
    title: { en: "Walk or cycle trips under 2 km", hi: "2 किमी से छोटे सफ़र पैदल या साइकिल से करें" },
    body: {
      en: "Short trips in a cold engine are the dirtiest per kilometre. Do them in the clean window of the day and skip the car.",
      hi: "ठंडे इंजन के छोटे सफ़र प्रति किलोमीटर सबसे ज़्यादा प्रदूषण करते हैं। इन्हें दिन के साफ़ समय में करें और गाड़ी छोड़ दें।",
    },
    scope: "personal",
    applies: motorised,
    impact: (p) => commuteSwitch(p, "cycle_walk", 8),
  },
  {
    id: "cooking_lpg",
    title: { en: "Move cooking to LPG or induction", hi: "खाना LPG या इंडक्शन पर पकाएँ" },
    body: {
      en: "Wood, coal and kerosene stoves fill the kitchen with smoke at levels far above any outdoor smog. Check eligibility for a subsidised connection under PM Ujjwala Yojana.",
      hi: "लकड़ी, कोयले और मिट्टी के तेल के चूल्हे रसोई में बाहर की धुंध से कहीं ज़्यादा धुआँ भरते हैं। प्रधानमंत्री उज्ज्वला योजना के तहत सस्ते कनेक्शन की पात्रता देखें।",
    },
    scope: "home",
    applies: dirtyFuel,
    impact: () => ({ doseCutPct: 80 }),
    source: "who-hap",
  },
  {
    id: "heating_safe",
    title: { en: "Replace the angithi with safer heat", hi: "अंगीठी की जगह सुरक्षित हीटर लगाएँ" },
    body: {
      en: "Burning coal or wood in a closed room fills it with smoke and can cause deadly carbon monoxide poisoning. Use an oil-filled heater, extra layers, or seal drafts instead.",
      hi: "बंद कमरे में कोयला या लकड़ी जलाने से धुआँ भरता है और जानलेवा कार्बन मोनोऑक्साइड बन सकती है। ऑयल हीटर, गर्म कपड़े, या दरारें बंद करना बेहतर है।",
    },
    scope: "home",
    applies: (p) => p.heating === "wood_coal",
    impact: () => ({ doseCutPct: 70 }),
    source: "who-hap",
  },
  {
    id: "compost_not_burn",
    title: { en: "Compost leaves and waste, never burn them", hi: "पत्ते और कचरा जलाएँ नहीं, खाद बनाएँ" },
    body: {
      en: "A small pile burning in a lane smokes out every home around it. A compost bin or the municipal pickup does the job with no smoke.",
      hi: "गली में जलता छोटा ढेर आसपास के हर घर में धुआँ भर देता है। खाद का डिब्बा या नगर निगम की गाड़ी बिना धुएँ के यही काम करती है।",
    },
    scope: "community",
    applies: always,
    impact: () => burningAvoided(2),
    source: "burning",
  },
  {
    id: "report_burning",
    title: { en: "Report open burning nearby", hi: "आसपास खुले में जलाने की शिकायत करें" },
    body: {
      en: "Use your city's pollution complaint app or helpline (in Delhi, the Green Delhi app). Complaints with a photo and location get acted on fastest.",
      hi: "अपने शहर का प्रदूषण शिकायत ऐप या हेल्पलाइन इस्तेमाल करें (दिल्ली में ग्रीन दिल्ली ऐप)। फ़ोटो और जगह के साथ की गई शिकायत पर सबसे जल्दी कार्रवाई होती है।",
    },
    scope: "community",
    applies: always,
    impact: () => ({}),
  },
  {
    id: "share_advisory",
    title: { en: "Share today's advice with your building", hi: "आज की सलाह अपनी सोसाइटी से साझा करें" },
    body: {
      en: "Send the clean-air window to your RWA or school parents' group so every family plans around the same safe hours.",
      hi: "साफ़ हवा का समय अपनी RWA या स्कूल के अभिभावक ग्रुप में भेजें, ताकि हर परिवार उन्हीं सुरक्षित घंटों के हिसाब से योजना बनाए।",
    },
    scope: "community",
    applies: always,
    impact: () => ({}),
  },
];

const byId = <T extends { id: string }>(list: readonly T[]) => new Map(list.map((x) => [x.id, x] as const));
export const INDOOR_BY_ID = byId(INDOOR);
export const SWAPS_BY_ID = byId(SWAPS);

export const applicableIndoor = (p: Profile) => INDOOR.filter((h) => h.applies(p));
export const applicableSwaps = (p: Profile) => SWAPS.filter((s) => s.applies(p));
