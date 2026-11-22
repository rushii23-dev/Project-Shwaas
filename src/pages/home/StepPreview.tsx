import { useApp } from "../../state/AppState";

/* ----------------------------------------------------- step previews */

/** Miniature, decorative renderings of the planner for each step. */
export function StepPreview({ index }: { index: number }) {
  const { lang } = useApp();
  const hi = lang === "hi";
  const card = "rounded-2xl border border-white/10 bg-night-2 p-5 text-white shadow-2xl";
  if (index === 0) {
    return (
      <div className={card}>
        <div className="rounded-xl bg-white/5 px-4 py-3 text-mist">{hi ? "लखनऊ" : "Lucknow"}</div>
        <div className="mt-3 grid gap-2">
          {[
            ["Lucknow", "Uttar Pradesh, India"],
            ["Lucknow Cantonment", "Uttar Pradesh, India"],
          ].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/[0.04] px-4 py-3">
              <p className="font-semibold">{a}</p>
              <p className="text-sm text-mist-2">{b}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-full bg-accent py-3 text-center font-semibold text-accent-ink">
          {hi ? "मेरी लोकेशन इस्तेमाल करें" : "Use my location"}
        </div>
      </div>
    );
  }
  if (index === 1) {
    const chips = hi
      ? [
          ["छोटे बच्चे", true],
          ["बुज़ुर्ग (65+)", true],
          ["अस्थमा", false],
          ["मेट्रो", true],
          ["LPG सिलेंडर", true],
          ["सुबह की सैर", true],
          ["प्यूरीफ़ायर", false],
        ]
      : [
          ["Young children", true],
          ["Older adults (65+)", true],
          ["Asthma", false],
          ["Metro", true],
          ["LPG cylinder", true],
          ["Morning walk", true],
          ["Air purifier", false],
        ];
    return (
      <div className={card}>
        <div className="flex flex-wrap gap-2">
          {chips.map(([l, on]) => (
            <span
              key={String(l)}
              className={`rounded-full border px-4 py-2 text-sm ${on ? "border-accent bg-accent/15 text-white" : "border-white/15 text-mist"}`}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (index === 2) {
    const rows = hi
      ? [
          ["सुबह 7:30", "स्कूल जाते समय मास्क पहनाएँ"],
          ["दोपहर 1 बजे", "बाहर खेलने का साफ़ समय"],
          ["शाम 6 बजे", "खिड़कियाँ और दरवाज़े बंद करें"],
          ["रात 9:30", "बेडरूम में प्यूरीफ़ायर"],
        ]
      : [
          ["7:30 am", "School run with masks on"],
          ["1 pm", "Outdoor play, cleanest hour"],
          ["6 pm", "Shut windows and doors"],
          ["9:30 pm", "Purifier on in the bedroom"],
        ];
    return (
      <div className={card}>
        <p className="mb-4 inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
          {hi ? "Gemini ने आपके घर के लिए लिखी" : "Written by Gemini for your household"}
        </p>
        <ul className="grid gap-4">
          {rows.map(([time, label]) => (
            <li key={time} className="grid grid-cols-[5.5rem_1fr] gap-3 border-l-2 border-white/15 pl-4">
              <span className="font-semibold tabular-nums text-mist">{time}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const rows = hi
    ? [
        ["कार की जगह मेट्रो", "8.8 किलो CO₂"],
        ["एक पड़ोसी के साथ कारपूल", "5.6 किलो CO₂"],
        ["दोपहर 1 बजे व्यायाम", "70% कम PM2.5"],
      ]
    : [
        ["Metro instead of the car", "8.8 kg CO₂"],
        ["Carpool with a neighbour", "5.6 kg CO₂"],
        ["Workout moved to 1 pm", "70% less PM2.5"],
      ];
  return (
    <div className={card}>
      <ul className="grid">
        {rows.map(([a, b]) => (
          <li key={a} className="flex items-baseline justify-between gap-4 border-b border-white/10 py-4 last:border-0">
            <span>{a}</span>
            <span className="font-display text-2xl text-accent">{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-mist-2">{hi ? "हर हफ़्ते, आपके सफ़र के हिसाब से" : "Per week, from your own commute"}</p>
    </div>
  );
}
