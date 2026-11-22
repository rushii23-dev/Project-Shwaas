import { useId, useState, type ReactNode } from "react";
import { ACTIVITIES, DEFAULT_PROFILE, FUELS, HEATING, MODES, SENSITIVE } from "../lib/profile";
import type { Profile } from "../lib/types";
import { useApp } from "../state/AppState";

/**
 * Household questions as real fieldsets of checkboxes and radios, so keyboard
 * and screen-reader users get native behaviour. Everything stays on device.
 */
export function HouseholdForm({
  initial,
  onSave,
  onSkip,
  submitLabel,
}: {
  initial: Profile | null;
  onSave: (p: Profile) => void;
  onSkip?: () => void;
  submitLabel: string;
}) {
  const { t } = useApp();
  const [p, setP] = useState<Profile>(initial ?? DEFAULT_PROFILE);
  const kmId = useId();
  const daysId = useId();

  const toggle = <K extends "sensitive" | "activities">(key: K, v: Profile[K][number]) =>
    setP((cur) => {
      const list = cur[key] as string[];
      return { ...cur, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    });

  const commuting = p.commute.mode !== "wfh";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(p);
      }}
      className="grid gap-7"
    >
      <Group legend={t("household.sensitive")}>
        {SENSITIVE.map((g) => (
          <Chip key={g} type="checkbox" checked={p.sensitive.includes(g)} onChange={() => toggle("sensitive", g)}>
            {t(`sensitive.${g}`)}
          </Chip>
        ))}
      </Group>

      <Group legend={t("household.activities")}>
        {ACTIVITIES.map((a) => (
          <Chip key={a} type="checkbox" checked={p.activities.includes(a)} onChange={() => toggle("activities", a)}>
            {t(`act.${a}`)}
          </Chip>
        ))}
      </Group>

      <Group legend={t("household.commute")}>
        {MODES.map((m) => (
          <Chip
            key={m}
            type="radio"
            name="mode"
            checked={p.commute.mode === m}
            onChange={() => setP({ ...p, commute: { ...p.commute, mode: m } })}
          >
            {t(`mode.${m}`)}
          </Chip>
        ))}
        {commuting && (
          <div className="mt-2 flex w-full flex-wrap gap-4">
            <label htmlFor={kmId} className="grid gap-1 text-sm font-medium text-ink-2">
              {t("household.km")}
              <input
                id={kmId}
                className="field w-32 text-base text-ink"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={p.commute.km}
                onChange={(e) => setP({ ...p, commute: { ...p.commute, km: clampInt(e.target.value, 0, 100) } })}
              />
            </label>
            <label htmlFor={daysId} className="grid gap-1 text-sm font-medium text-ink-2">
              {t("household.days")}
              <input
                id={daysId}
                className="field w-32 text-base text-ink"
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                value={p.commute.daysPerWeek}
                onChange={(e) => setP({ ...p, commute: { ...p.commute, daysPerWeek: clampInt(e.target.value, 0, 7) } })}
              />
            </label>
          </div>
        )}
      </Group>

      <Group legend={t("household.cooking")}>
        {FUELS.map((f) => (
          <Chip key={f} type="radio" name="fuel" checked={p.cooking === f} onChange={() => setP({ ...p, cooking: f })}>
            {t(`fuel.${f}`)}
          </Chip>
        ))}
      </Group>

      <Group legend={t("household.heating")}>
        {HEATING.map((h) => (
          <Chip key={h} type="radio" name="heating" checked={p.heating === h} onChange={() => setP({ ...p, heating: h })}>
            {t(`heat.${h}`)}
          </Chip>
        ))}
      </Group>

      <Group legend={t("household.home")}>
        <Chip type="checkbox" checked={p.purifier} onChange={() => setP({ ...p, purifier: !p.purifier })}>
          {t("household.purifier")}
        </Chip>
        <Chip type="checkbox" checked={p.smokingIndoors} onChange={() => setP({ ...p, smokingIndoors: !p.smokingIndoors })}>
          {t("household.smoking")}
        </Chip>
      </Group>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" className="btn btn-primary px-6 text-lg">
          {submitLabel}
        </button>
        {onSkip && (
          <button type="button" className="btn px-4 text-ink-2 underline-offset-4 hover:underline" onClick={onSkip}>
            {t("household.skip")}
          </button>
        )}
      </div>
    </form>
  );
}

function clampInt(v: string, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-3 text-lg font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "checkbox" | "radio";
  name?: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label className="chip" htmlFor={id}>
      <input id={id} type={type} name={name} checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
