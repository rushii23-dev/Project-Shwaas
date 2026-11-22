import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAir } from "../hooks/useAir";
import { useOnline } from "../lib/pwa";
import { usePlan } from "../hooks/usePlan";
import type { Place, Profile } from "../lib/types";
import { useApp } from "../state/AppState";
import { Dialog } from "./Dialog";
import { Footer } from "./Footer";
import { ForecastChart } from "./ForecastChart";
import { PlanBar } from "./PlanBar";
import { HouseholdForm } from "./HouseholdForm";
import { HouseholdSummary } from "./HouseholdSummary";
import { IndoorSection } from "./IndoorSection";
import { OutlookSection } from "./OutlookSection";
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
  const online = useOnline();
  const { insights, plan, writing, fallbackReason, regenerate } = usePlan(air.snap, profile, lang);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

  return (
    <div className="pt-[var(--header-h)] print:pt-0">
      <PlanBar onPlace={() => setOpen("place")} onSettings={() => setOpen("settings")} />

      <div>
        {!air.snap ? (
          <StatusScreen error={air.error} onRetry={air.refresh} />
        ) : (
          <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {insights && <SkyPanel snap={air.snap} ins={insights} plan={plan} loading={air.loading} onRefresh={air.refresh} />}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-16 px-4 py-12 sm:px-8 lg:px-14">
              {(air.error || !online) && (
                <p role="status" className="rounded-2xl bg-paper-2 px-4 py-3 text-warn">
                  {online ? t("sky.stale") : t("sky.offline")}
                </p>
              )}
              {plan && insights && (
                <>
                  <PlanSection
                    plan={plan}
                    nowHour={insights.nowHour}
                    dose={insights.familyDose}
                    writing={writing}
                    fallbackReason={fallbackReason}
                    onRegenerate={regenerate}
                  />
                  <ForecastChart hours={air.snap.hourly} ins={insights} />
                  <OutlookSection hours={air.snap.hourly} />
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
      </div>

      {air.snap && insights && (
        <button
          type="button"
          onClick={() => setOpen("chat")}
          className="btn btn-primary fixed bottom-[max(1rem,env(safe-area-inset-bottom))] print:hidden right-4 z-40 min-h-13 px-5 text-base shadow-xl"
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
    </div>
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
          <span className="size-3 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          {t("loading")}
        </p>
      )}
    </div>
  );
}
