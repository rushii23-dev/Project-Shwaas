import { Pencil } from "lucide-react";
import type { MessageKey } from "../lib/i18n";
import type { Profile } from "../lib/types";
import { useApp } from "../state/AppState";

export function HouseholdSummary({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const { t } = useApp();
  const parts = [
    profile.sensitive.length ? profile.sensitive.map((g) => t(`sensitive.${g}` as MessageKey)).join(", ") : t("household.none"),
    t(`mode.${profile.commute.mode}` as MessageKey),
    t(`fuel.${profile.cooking}` as MessageKey),
    ...(profile.purifier ? [t("household.purifier")] : []),
  ];
  return (
    <section aria-labelledby="household-heading" className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-paper-2 px-6 py-5">
      <div>
        <h2 id="household-heading" className="text-lg font-semibold">
          {t("household.summary")}
        </h2>
        <p className="text-ink-2">{parts.join("; ")}</p>
      </div>
      <button type="button" onClick={onEdit} className="btn btn-quiet">
        <Pencil aria-hidden="true" size={16} />
        {t("household.edit")}
      </button>
    </section>
  );
}
