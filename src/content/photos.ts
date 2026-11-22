/**
 * Real photographs, all from Unsplash under the Unsplash License (free to use,
 * hot-linking from their CDN is the recommended way). Credits are shown on the
 * About page and beside each image.
 */
import type { Bilingual } from "./text";

export interface Photo {
  /** Unsplash CDN id ("photo-…"). */
  id: string;
  alt: Bilingual;
  /** Unsplash username of the photographer. */
  by: string;
  /** Unsplash photo page slug, for the credit link. */
  page: string;
  /** CSS object-position, to keep the subject in frame when cropped. */
  focus?: string;
}

const p = (id: string, by: string, page: string, en: string, hi: string, focus?: string): Photo => ({
  id,
  by,
  page,
  alt: { en, hi },
  ...(focus ? { focus } : {}),
});

export const PHOTOS = {
  indiaGateNight: p(
    "photo-1705259506430-cf0a734205cf",
    "abhijeet_gourav",
    "a-foggy-night-at-the-arc-of-triumph-4eEV2OniFOg",
    "India Gate in New Delhi glowing amber through thick winter smog at night",
    "रात में घनी सर्दियों की धुंध में नारंगी रोशनी में चमकता नई दिल्ली का इंडिया गेट",
    "50% 60%",
  ),
  indiaGateHaze: p(
    "photo-1766405530979-c446de891179",
    "anshu4u",
    "india-gate-monument-in-a-hazy-atmosphere-eJQkIuWGGL8",
    "India Gate almost lost in a pale daytime haze",
    "दिन की फीकी धुंध में लगभग छिपा इंडिया गेट",
    "50% 40%",
  ),
  crossingHaze: p(
    "photo-1794591479646-e87286c0492b",
    "ravinepz",
    "people-crossing-hazy-intersection-in-new-delhi-juAxHkwdGg0",
    "People crossing a hazy intersection in New Delhi as the sun sets through smog",
    "धुंध के बीच ढलते सूरज में नई दिल्ली के एक चौराहे को पार करते लोग",
    "50% 70%",
  ),
  maskedWalk: p(
    "photo-1632402116914-05f78e513a53",
    "singhrupinder",
    "a-group-of-people-walking-down-a-street-lOcZm3Ggfy8",
    "People in masks and winter jackets walking down a smoggy street",
    "मास्क और गर्म कपड़ों में धुंध भरी सड़क पर चलते लोग",
  ),
  twoWheelers: p(
    "photo-1559897135-0ee247ae807b",
    "atharva_tulsi",
    "vehicles-on-road-during-night-time-zTdh_ft2oRM",
    "Motorbikes and cars streaming through hazy evening traffic",
    "शाम के धुंधले ट्रैफ़िक में चलती मोटरसाइकिलें और गाड़ियाँ",
  ),
  fieldFire: p(
    "photo-1740984430819-dd8b4e5288b6",
    "my65roses",
    "sugar-cane-field-ablaze-with-plumes-of-smoke-qdDGG8kXlAU",
    "A crop field burning, sending plumes of smoke across the sky",
    "जलता हुआ खेत, आसमान में धुएँ के गुबार",
    "60% 60%",
  ),
  powerPlant: p(
    "photo-1691927458684-8b30380b9412",
    "baj810",
    "smoke-billows-from-the-cooling-towers-of-a-power-plant-MG_0AXIrphs",
    "Smoke and steam rising from the chimneys and cooling towers of a power plant",
    "एक बिजलीघर की चिमनियों और कूलिंग टावरों से उठता धुआँ",
  ),
  woodStove: p(
    "photo-1775377617218-f7a3e6c8499e",
    "alan_j",
    "outdoor-stove-with-burning-wood-and-pot-r1pX08YRdKo",
    "A wood fire burning inside a simple cooking stove",
    "एक साधारण चूल्हे में जलती लकड़ी",
    "50% 65%",
  ),
  boyMask: p(
    "photo-1591903524950-370c9b70a068",
    "shazzadulalam",
    "boy-in-blue-red-and-white-plaid-button-up-shirt-FadtSkCL6VE",
    "A young boy wearing a blue protective mask looks into the camera",
    "नीला मास्क पहने एक छोटा लड़का कैमरे की ओर देखता हुआ",
    "50% 35%",
  ),
  metro: p(
    "photo-1590657004813-b82c66b4c588",
    "dewang",
    "man-in-black-jacket-sitting-beside-yellow-and-red-train-JtbiKg_iVdA",
    "A Delhi Metro train waiting at a platform",
    "प्लेटफ़ॉर्म पर खड़ी दिल्ली मेट्रो",
  ),
  cyclist: p(
    "photo-1621576912675-f62566f2ebc5",
    "kbobike",
    "man-in-white-shirt-riding-bicycle-on-road-during-daytime-aUb6Fi45k70",
    "A man cycling along a tree-lined city road on a clear day",
    "साफ़ दिन में पेड़ों से घिरी सड़क पर साइकिल चलाता एक व्यक्ति",
  ),
  clearSky: p(
    "photo-1620749835958-14b6201ea2eb",
    "nickoencina22",
    "people-on-street-during-daytime-ERd2t4Llofw",
    "A city spread out under a wide, clear blue sky",
    "साफ़ नीले आसमान के नीचे फैला एक शहर",
    "50% 80%",
  ),
  dustSkyline: p(
    "photo-1761530376342-8e0a2b0abdab",
    "conservationcommons",
    "city-skyline-obscured-by-a-thick-orange-dust-storm-EQU4ZG0b3jE",
    "A city skyline swallowed by a thick orange haze",
    "घनी नारंगी धुंध में डूबा शहर का आसमान",
  ),
  wildfire: p(
    "photo-1692364221415-654b20e6d1d2",
    "fachymarin",
    "a-large-fire-burning-in-a-field-next-to-a-forest-EQkV-J2kw0U",
    "A wildfire burning along a forest edge under a smoke-filled sky",
    "धुएँ से भरे आसमान के नीचे जंगल के किनारे जलती आग",
  ),
  palaceSmog: p(
    "photo-1646824076279-1fe5653509ee",
    "choudharism",
    "a-group-of-people-walking-down-a-street-next-to-tall-buildings-hYKH4kZKDPI",
    "Rashtrapati Bhavan in New Delhi faded behind a grey wall of smog",
    "धुंध की धूसर दीवार के पीछे फीका दिखता नई दिल्ली का राष्ट्रपति भवन",
    "50% 45%",
  ),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

const WIDTHS = [480, 800, 1200, 1600, 2200];

/** Unsplash's CDN resizes and picks AVIF/WebP for us. */
export function photoUrl(photo: Photo, width: number, quality = 72): string {
  return `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

export function photoSrcSet(photo: Photo): string {
  return WIDTHS.map((w) => `${photoUrl(photo, w)} ${w}w`).join(", ");
}

export const creditUrl = (photo: Photo) => `https://unsplash.com/photos/${photo.page}`;
export const profileUrl = (photo: Photo) => `https://unsplash.com/@${photo.by}`;
