import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAir } from "../hooks/useAir";
import { usePlan } from "../hooks/usePlan";
import type { Place, Profile } from "../lib/types";
import { useApp } from "../state/AppState";
import { Dialog } from "./Dialog";
import { Footer } from "./Footer";
import { ForecastChart } from "./ForecastChart";
import { Header } from "./Header";
import { HouseholdForm } from "./HouseholdForm";
import { HouseholdSummary } from "./HouseholdSummary";
import { IndoorSection } from "./IndoorSection";
import { PlaceSearch } from "./PlaceSearch";
import { PlanSection } from "./PlanSection";
import { SettingsDialog } from "./SettingsDialog";
import { ShareCard } from "./ShareCard";
import { SkyPanel } from "./SkyPanel";
import { SwapLedger } from "./SwapLedger";

const ChatPanel = lazy(() => import("./ChatPanel"));

type Open = null | "place" | "settings" | "household" | "chat";

export function Dashboard({ place, profile }: { place: Place; profile: Profile }) {
  const { t, lang, setPlace, setProfile } = useApp();
  const air = useAir(place);
  const { insights, plan, writing, fallbackReason, regenerate } = usePlan(air.snap, profile, lang);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

  return (
    <>
      <a href="#plan-heading" className="sr-only z-50 rounded-full bg-iris px-4 py-2 text-iris-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {t("skip")}
      </a>
      <Header onPlace={() => setOpen("place")} onSettings={() => setOpen("settings")} />

      <main id="main">
        {!air.snap ? (
          <StatusScreen error={air.error} onRetry={air.refresh} />
        ) : (
          <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {insights && <SkyPanel snap={air.snap} ins={insights} plan={plan} loading={air.loading} onRefresh={air.refresh} />}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-16 px-4 py-12 sm:px-8 lg:px-14">
              {air.error && (
                <p role="alert" className="rounded-2xl bg-paper-2 px-4 py-3 text-warn">
                  {t("sky.stale")}
                </p>
              )}
              {plan && insights && (
                <>
                  <PlanSection plan={plan} nowHour={insights.nowHour} writing={writing} fallbackReason={fallbackReason} onRegenerate={regenerate} />
                  <ForecastChart hours={air.snap.hourly} ins={insights} />
                  <IndoorSection picks={plan.indoor} />
                  <SwapLedger picks={plan.swaps} profile={profile} />
                  <HouseholdSummary profile={profile} onEdit={() => setOpen("household")} />
                  <ShareCard snap={air.snap} ins={insights} />
                </>
              )}
              <Footer />
            </div>
          </div>
        )}
      </main>

      {air.snap && insights && (
        <button
          type="button"
          onClick={() => setOpen("chat")}
          className="btn btn-primary fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 min-h-13 px-5 text-base shadow-xl"
        >
          <MessageCircle aria-hidden="true" size={20} />
          {t("chat.open")}
        </button>
      )}

      <Dialog open={open === "place"} onClose={close} title={t("search.title")}>
        <div className="p-5">
          <PlaceSearch
            focusOnMount
            onPick={(p) => {
              setPlace(p);
              close();
            }}
          />
        </div>
      </Dialog>

      <Dialog open={open === "household"} onClose={close} title={t("household.title")}>
        <div className="p-5">
          <HouseholdForm
            initial={profile}
            submitLabel={t("household.update")}
            onSave={(p) => {
              setProfile(p);
              close();
            }}
          />
        </div>
      </Dialog>

      <SettingsDialog open={open === "settings"} onClose={close} />

      <Dialog open={open === "chat"} onClose={close} title={t("chat.title")} variant="side">
        {air.snap && insights && (
          <Suspense fallback={<p className="p-5 text-ink-2">{t("chat.thinking")}</p>}>
            <ChatPanel snap={air.snap} ins={insights} profile={profile} />
          </Suspense>
        )}
      </Dialog>
    </>
  );
}

function StatusScreen({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  const { t } = useApp();
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 text-center">
      {error ? (
        <div role="alert">
          <p className="max-w-md text-lg">{t("error.air")}</p>
          <button type="button" onClick={onRetry} className="btn btn-primary mt-4">
            {t("retry")}
          </button>
        </div>
      ) : (
        <p role="status" className="flex items-center gap-3 text-lg text-ink-2">
          <span className="size-3 animate-pulse rounded-full bg-iris" aria-hidden="true" />
          {t("loading")}
        </p>
      )}
    </div>
  );
}
