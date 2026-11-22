/** Smog guide copy: health effects, AQI bands, what protects you, and myths, in both languages. */
import type { BandId } from "../lib/aqi";
import type { Bilingual } from "../lib/types";

/** A protective measure (or a false one) with the evidence for its effect. */
export interface Evidence {
  title: Bilingual;
  detail: Bilingual;
}

export const copy = {
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

export const BODY: { title: Bilingual; body: Bilingual }[] = [
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

export const BAND_ADVICE: Record<BandId, Bilingual> = {
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

export const WORKS: Evidence[] = [
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

export const DOESNT: Evidence[] = [
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

export const MYTHS: { myth: Bilingual; fact: Bilingual }[] = [
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
