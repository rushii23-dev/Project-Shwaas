/** Home page copy and sourced statistics, in both languages. */
import { PHOTOS } from "./photos";
import { SRC, type Bilingual, type Source } from "./text";

export const copy = {
  heroTitle: {
    en: "Get your family through smog season, one clear hour at a time.",
    hi: "धुंध के मौसम में अपने परिवार का साथ, एक-एक साफ़ घंटे के साथ।",
  },
  heroLede: {
    en: "Shwaas reads the air forecast where you live and turns it into a plan for your home: when to step out, how to keep indoor air clean, and which small changes cut pollution the most. Every choice comes with its impact worked out.",
    hi: "श्वास आपके इलाके की हवा का पूर्वानुमान पढ़कर आपके घर के लिए योजना बनाता है: कब बाहर निकलें, घर की हवा कैसे साफ़ रखें, और कौन से छोटे बदलाव प्रदूषण सबसे ज़्यादा घटाते हैं। हर फ़ैसले का असर साथ में।",
  },
  heroCta: { en: "Plan my family's day", hi: "मेरे परिवार का दिन प्लान करें" },
  heroSecondary: { en: "See the air worldwide", hi: "दुनिया भर की हवा देखें" },
  live: { en: "Delhi right now: AQI {aqi}, {band}", hi: "दिल्ली अभी: AQI {aqi}, {band}" },
  scroll: { en: "Scroll", hi: "नीचे देखें" },

  statement: {
    en: "Ninety-nine percent of people on Earth breathe air the WHO considers unsafe. In a North Indian winter, one day outdoors can carry the risk of several cigarettes, and most families have no way to see which hours matter.",
    hi: "धरती पर निन्यानबे प्रतिशत लोग ऐसी हवा में साँस लेते हैं जिसे WHO असुरक्षित मानता है। उत्तर भारत की सर्दी में बाहर बिताया एक दिन कई सिगरेट जितना जोखिम ला सकता है, और ज़्यादातर परिवारों को पता ही नहीं होता कि कौन से घंटे मायने रखते हैं।",
  },

  tollTitle: { en: "What the air is costing us", hi: "यह हवा हमसे क्या छीन रही है" },

  causesTitle: { en: "Why winter is the worst", hi: "सर्दी सबसे ख़राब क्यों होती है" },
  causesLede: {
    en: "The smoke is there all year. Winter is when the sky stops carrying it away.",
    hi: "धुआँ साल भर रहता है। सर्दियों में आसमान उसे ले जाना बंद कर देता है।",
  },

  howTitle: { en: "How Shwaas helps", hi: "श्वास कैसे मदद करता है" },

  clearTitle: {
    en: "Clean air isn't luck. It's a thousand small decisions, made at the right hour.",
    hi: "साफ़ हवा क़िस्मत नहीं है। यह सही समय पर लिए गए हज़ारों छोटे फ़ैसले हैं।",
  },
  clearBody: {
    en: "Moving a walk by three hours. Taking the metro one day a week. Keeping one room clean overnight. Across a city, small choices add up to air you can see through.",
    hi: "सैर को तीन घंटे आगे करना। हफ़्ते में एक दिन मेट्रो लेना। रात भर एक कमरे की हवा साफ़ रखना। पूरे शहर में ये छोटे फ़ैसले मिलकर साफ़ आसमान बनाते हैं।",
  },
  clearCta: { en: "Start with tomorrow morning", hi: "कल सुबह से शुरू करें" },

  exploreWorld: { en: "World air, live", hi: "दुनिया की हवा, लाइव" },
  exploreWorldBody: {
    en: "Fourteen cities, updated hourly, and the numbers behind the crisis.",
    hi: "चौदह शहर, हर घंटे अपडेट, और इस संकट के पीछे के आँकड़े।",
  },
  exploreSmog: { en: "Understanding winter smog", hi: "सर्दियों की धुंध को समझें" },
  exploreSmogBody: {
    en: "What PM2.5 does to the body, and what actually protects your family.",
    hi: "PM2.5 शरीर पर क्या असर करता है, और असल में परिवार को क्या बचाता है।",
  },
} satisfies Record<string, Bilingual>;

export interface Stat {
  value: Record<"en" | "hi", number>;
  decimals: Record<"en" | "hi", number>;
  format: Bilingual;
  body: Bilingual;
  source: Source;
}

export const STATS: Stat[] = [
  {
    value: { en: 8.1, hi: 81 },
    decimals: { en: 1, hi: 0 },
    format: { en: "{n} million", hi: "{n} लाख" },
    body: {
      en: "deaths worldwide were linked to air pollution in 2021: more than one in every eight.",
      hi: "मौतें 2021 में दुनिया भर में वायु प्रदूषण से जुड़ी थीं: हर आठ में से एक से ज़्यादा।",
    },
    source: SRC.soga2024,
  },
  {
    value: { en: 700000, hi: 7 },
    decimals: { en: 0, hi: 0 },
    format: { en: "{n}+", hi: "{n} लाख+" },
    body: {
      en: "of them were children under five. For them, polluted air is the second-biggest risk factor after malnutrition.",
      hi: "उनमें पाँच साल से छोटे बच्चे थे। उनके लिए कुपोषण के बाद प्रदूषित हवा दूसरा सबसे बड़ा ख़तरा है।",
    },
    source: SRC.soga2024,
  },
  {
    value: { en: 8.2, hi: 8.2 },
    decimals: { en: 1, hi: 1 },
    format: { en: "{n} years", hi: "{n} साल" },
    body: {
      en: "of life Delhi residents could gain if the air met the WHO guideline.",
      hi: "की उम्र दिल्ली वाले पा सकते हैं, अगर हवा WHO के मानक पर हो।",
    },
    source: SRC.aqli2025,
  },
  {
    value: { en: 13, hi: 13 },
    decimals: { en: 0, hi: 0 },
    format: { en: "{n} of 20", hi: "20 में से {n}" },
    body: {
      en: "of the world's most polluted cities in 2024 were in India. Delhi was the most polluted capital.",
      hi: "दुनिया के सबसे प्रदूषित शहर 2024 में भारत में थे। दिल्ली सबसे प्रदूषित राजधानी रही।",
    },
    source: SRC.iqair2024,
  },
];

export const CAUSES = [
  {
    photo: PHOTOS.indiaGateHaze,
    title: { en: "A lid on the city", hi: "शहर पर ढक्कन" },
    body: {
      en: "On cold, still nights a layer of warm air settles over cooler air near the ground. Smoke from every exhaust, chimney and fire is trapped at breathing height until the sun breaks the lid.",
      hi: "ठंडी, शांत रातों में ज़मीन के पास की ठंडी हवा के ऊपर गर्म हवा की परत बैठ जाती है। हर गाड़ी, चिमनी और आग का धुआँ साँस की ऊँचाई पर फँस जाता है, जब तक धूप यह ढक्कन न तोड़ दे।",
    },
  },
  {
    photo: PHOTOS.twoWheelers,
    title: { en: "Traffic", hi: "ट्रैफ़िक" },
    body: {
      en: "Exhaust, brake and tyre dust, and road dust kicked back into the air. On winter days, transport is one of the largest local sources of Delhi's fine particles.",
      hi: "धुआँ, ब्रेक और टायर की धूल, और सड़क की धूल जो फिर हवा में उड़ती है। सर्दियों में दिल्ली के बारीक कणों का सबसे बड़ा स्थानीय स्रोत ट्रैफ़िक है।",
    },
  },
  {
    photo: PHOTOS.fieldFire,
    title: { en: "Crop fires", hi: "पराली की आग" },
    body: {
      en: "After the rice harvest, stubble is burned across the plains. Depending on the wind, its share of Delhi's PM2.5 swings from a few percent to over a third on peak November days.",
      hi: "धान की कटाई के बाद मैदानों में पराली जलाई जाती है। हवा के रुख़ के हिसाब से, नवंबर के चरम दिनों में दिल्ली के PM2.5 में इसका हिस्सा कुछ प्रतिशत से एक-तिहाई तक पहुँच जाता है।",
    },
  },
  {
    photo: PHOTOS.woodStove,
    title: { en: "Kitchens and coal", hi: "चूल्हे और कोयला" },
    body: {
      en: "About 2.1 billion people still cook on open fires or inefficient stoves. In winter, wood and coal heat homes too, filling rooms and lanes with smoke.",
      hi: "लगभग 2.1 अरब लोग अब भी खुली आग या पुराने चूल्हों पर खाना बनाते हैं। सर्दियों में लकड़ी और कोयला घर भी गर्म करते हैं, जिससे कमरे और गलियाँ धुएँ से भर जाती हैं।",
    },
  },
  {
    photo: PHOTOS.powerPlant,
    title: { en: "Industry and power", hi: "उद्योग और बिजली" },
    body: {
      en: "Coal power plants, brick kilns and factories across the region add a steady base of pollution that winter weather concentrates.",
      hi: "इलाके के कोयला बिजलीघर, ईंट भट्ठे और कारखाने प्रदूषण की एक स्थायी परत जोड़ते हैं, जिसे सर्दियों का मौसम और गाढ़ा कर देता है।",
    },
  },
];

export const STEPS = [
  {
    title: { en: "Tell it where you are", hi: "बताइए आप कहाँ हैं" },
    body: {
      en: "Any city or neighbourhood, anywhere. Your location is rounded to about a kilometre before it leaves your phone.",
      hi: "कोई भी शहर या इलाका, कहीं भी। आपकी लोकेशन फ़ोन से बाहर जाने से पहले लगभग एक किलोमीटर तक गोल की जाती है।",
    },
  },
  {
    title: { en: "Tell it who's at home", hi: "बताइए घर में कौन है" },
    body: {
      en: "Young children, older parents, asthma, how you commute, what you cook on. Thirty seconds, and it never leaves your device.",
      hi: "छोटे बच्चे, बुज़ुर्ग माता-पिता, अस्थमा, सफ़र कैसे करते हैं, खाना किस पर पकाते हैं। तीस सेकंड, और यह जानकारी आपके फ़ोन पर ही रहती है।",
    },
  },
  {
    title: { en: "Get your day, hour by hour", hi: "पाइए अपना दिन, घंटे-दर-घंटे" },
    body: {
      en: "The cleanest window to step out, when to shut the windows, what to do on the school run. Written by Gemini for your family, checked by our rules.",
      hi: "बाहर निकलने का सबसे साफ़ समय, खिड़कियाँ कब बंद करें, स्कूल जाते वक़्त क्या करें। Gemini ने आपके परिवार के लिए लिखा, हमारे नियमों ने जाँचा।",
    },
  },
  {
    title: { en: "See what each change is worth", hi: "देखिए हर बदलाव का असर" },
    body: {
      en: "Metro instead of the car, a workout moved to the afternoon, a purifier in the bedroom: each one comes with its effect in kilograms, grams and percent.",
      hi: "कार की जगह मेट्रो, दोपहर में व्यायाम, बेडरूम में प्यूरीफ़ायर: हर बदलाव का असर किलो, ग्राम और प्रतिशत में।",
    },
  },
];
