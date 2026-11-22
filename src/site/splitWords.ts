/**
 * Split an element's text into one span per word, for word-by-word motion.
 *
 * Built with createElement/textContent only, never innerHTML, so it works
 * under an enforced Trusted Types policy (which GSAP's SplitText does not).
 * Spans carry no ARIA rewriting: screen readers read the words as written.
 *
 * With `mask`, each word sits in an overflow-hidden wrapper so it can rise
 * into view from below its own baseline.
 */
export interface SplitResult {
  /** The animatable word elements. */
  words: HTMLElement[];
  /** Restore the original text. */
  revert: () => void;
}

export function splitWords(el: HTMLElement, { mask = false }: { mask?: boolean } = {}): SplitResult {
  const original = el.textContent;
  const doc = el.ownerDocument;
  const words: HTMLElement[] = [];
  const parts = original.split(/(\s+)/);
  el.textContent = "";

  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      el.append(doc.createTextNode(" "));
      continue;
    }
    const word = doc.createElement("span");
    word.textContent = part;
    word.style.display = "inline-block";
    if (mask) {
      const clip = doc.createElement("span");
      clip.style.display = "inline-block";
      clip.style.overflow = "hidden";
      clip.style.verticalAlign = "bottom";
      // Room for descenders, so the mask doesn't crop "g", "y" and "p".
      clip.style.paddingBottom = "0.1em";
      clip.style.marginBottom = "-0.1em";
      clip.append(word);
      el.append(clip);
    } else {
      el.append(word);
    }
    words.push(word);
  }

  return {
    words,
    revert: () => {
      el.textContent = original;
    },
  };
}
