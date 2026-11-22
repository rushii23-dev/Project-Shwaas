import { Dashboard } from "./components/Dashboard";
import { HouseholdForm } from "./components/HouseholdForm";
import { SkyBackdrop } from "./components/SkyBackdrop";
import { Welcome } from "./components/Welcome";
import { Brand } from "./components/Brand";
import { LangToggle } from "./components/Header";
import { DEFAULT_PROFILE } from "./lib/profile";
import { useApp } from "./state/AppState";

/** Three states: choose a place → describe the household → the daily plan. */
export function App() {
  const { place, profile, setProfile, t } = useApp();

  if (!place) return <Welcome />;

  if (!profile) {
    return (
      <SkyBackdrop aqi={120} className="min-h-dvh">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-8">
          <div className="flex items-center justify-between">
            <Brand />
            <LangToggle />
          </div>
          <main id="main" className="lift mt-10 rounded-[2rem] bg-paper p-5 text-ink shadow-2xl sm:p-9">
            <h1 className="display text-[clamp(2.2rem,6vw,3.6rem)]">{t("household.title")}</h1>
            <p className="mb-8 mt-3 max-w-[52ch] text-lg text-ink-2">{t("household.intro")}</p>
            <HouseholdForm initial={null} onSave={setProfile} onSkip={() => setProfile(DEFAULT_PROFILE)} submitLabel={t("household.save")} />
          </main>
        </div>
      </SkyBackdrop>
    );
  }

  return <Dashboard place={place} profile={profile} />;
}
