"use client";

/**
 * Form yardımcıları: server action + toast + yönlendirme kalıbı.
 */
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * useActionState'i toast bildirimi ve başarı yönlendirmesiyle birleştirir.
 */
export function useActionForm(
  action: FormAction,
  options?: { redirectTo?: string | ((result: ActionResult) => string) }
) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const handled = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(state.message);
      const to =
        typeof options?.redirectTo === "function"
          ? options.redirectTo(state)
          : options?.redirectTo;
      if (to) router.push(to);
      router.refresh();
    } else {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return {
    state,
    formAction,
    pending,
    errors: (state && !state.ok ? state.fieldErrors : undefined) ?? {},
  };
}

export function SubmitButton({
  children,
  className,
  pendingText = "Kaydediliyor...",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("btn-primary", className)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

/** Tek tıkla çalışan server action butonu (form gerektirmez). */
export function ActionButton({
  action,
  children,
  className,
  onDone,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  onDone?: (result: ActionResult) => void;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={cn("btn-secondary", className)}
      onClick={async () => {
        const result = await action();
        if (result.ok) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
        onDone?.(result);
      }}
    >
      {children}
    </button>
  );
}
