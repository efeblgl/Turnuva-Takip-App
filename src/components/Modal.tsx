"use client";

/**
 * Sade modal ve kritik işlemler için onay düğmesi (şartname madde 43).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Odak yönetimi: modal açılınca panele odaklan
    panelRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 transition-opacity sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl outline-none sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost btn-sm -mr-1"
            aria-label="Kapat"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Kritik işlem düğmesi: önce onay modalı gösterir, onaylanınca action çalışır.
 */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = "Evet, devam et",
  children,
  className,
  danger,
}: {
  action: () => Promise<ActionResult>;
  title: string;
  description: string;
  confirmLabel?: string;
  children: ReactNode;
  className?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className={cn(danger ? "btn-danger" : "btn-secondary", className)}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={title}>
        <div className="flex items-start gap-3">
          <div className={cn("rounded-full p-2", danger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
            <TriangleAlert className="size-5" aria-hidden />
          </div>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className={danger ? "btn-danger" : "btn-primary"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await action();
                if (result.ok) {
                  toast.success(result.message);
                  setOpen(false);
                  router.refresh();
                } else {
                  toast.error(result.message);
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  );
}
