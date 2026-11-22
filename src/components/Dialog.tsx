import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useApp } from "../state/AppState";

/**
 * Native <dialog> as a modal: the browser handles focus trapping, Escape and
 * returning focus, which is more robust than a hand-rolled focus trap.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = "center",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: "center" | "side";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useApp();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const shape =
    variant === "side"
      ? "m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg rounded-none sm:rounded-l-3xl"
      : "m-auto w-[min(100%-2rem,38rem)] max-h-[min(90dvh,52rem)] rounded-3xl";

  return (
    // Backdrop click is a mouse convenience; keyboard users close with Escape or the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={`${shape} border border-line bg-paper p-0 text-ink shadow-2xl`}
    >
      {open && (
        <div className="flex h-full max-h-[inherit] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id={titleId} className="section-title text-2xl">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="btn btn-quiet size-11 p-0" aria-label={t("close")}>
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}
