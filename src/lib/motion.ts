/**
 * GSAP bootstrap. Registration runs once, here; import gsap and plugins from
 * this module everywhere. Trimmed to the plugins the site actually uses.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Motion only runs when the reader hasn't asked for less. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
