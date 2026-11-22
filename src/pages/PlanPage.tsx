import { Dashboard } from "../components/Dashboard";
import { HouseholdForm } from "../components/HouseholdForm";
import { Welcome } from "../components/Welcome";
import { PHOTOS } from "../content/photos";
import { DEFAULT_PROFILE } from "../lib/profile";
import { Photo } from "../site/Photo";
import { useApp } from "../state/AppState";

/** The planner: choose a place, describe the household, then the live daily plan. */
export default function PlanPage() {
  const { place, profile, setProfile, t } = useApp();

  if (!place) return <Welcome />;

  if (!profile) {
    return (
      <section className="on-night relative isolate min-h-[100svh] bg-night px-4 pb-20 pt-28 sm:px-8">
        <div className="absolute inset-0 -z-10">
          <Photo photo={PHOTOS.maskedWalk} priority className="h-full w-full" imgClassName="h-full w-full" />
          <div className="absolute inset-0 bg-night/80" />
        </div>
        <div className="lift mx-auto max-w-3xl rounded-[2rem] bg-paper p-6 text-ink shadow-2xl sm:p-10">
          <h1 tabIndex={-1} className="display text-[clamp(2.2rem,5.5vw,3.6rem)] outline-none">
            {t("household.title")}
          </h1>
          <p className="mb-9 mt-4 max-w-[52ch] text-lg text-ink-2">{t("household.intro")}</p>
          <HouseholdForm
            initial={null}
            onSave={setProfile}
            onSkip={() => setProfile(DEFAULT_PROFILE)}
            submitLabel={t("household.save")}
          />
        </div>
      </section>
    );
  }

  return <Dashboard place={place} profile={profile} />;
}
