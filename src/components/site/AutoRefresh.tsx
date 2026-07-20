"use client";

/**
 * Sayfayı belirli aralıklarla sessizce yeniler (router.refresh).
 * Canlı maç günlerinde skorların elle yenilemeye gerek kalmadan
 * güncellenmesi için kullanılır. Sekme arka plandayken yenilemez.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, Math.max(15, seconds) * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  return null;
}
