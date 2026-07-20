"use client";

/**
 * Fikstür filtreleri: seçimler URL parametrelerine yansır (şartname madde 46).
 * Mobilde açılır panel olarak gösterilir.
 */
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: "", label: "Tüm maçlar" },
  { value: "bugun", label: "Bugünkü maçlar" },
  { value: "yarin", label: "Yarınki maçlar" },
  { value: "hafta", label: "Bu haftaki maçlar" },
  { value: "yaklasan", label: "Yaklaşan maçlar" },
  { value: "tamamlanan", label: "Tamamlanan maçlar" },
  { value: "ertelenen", label: "Ertelenen maçlar" },
  { value: "iptal", label: "İptal edilen maçlar" },
  { value: "hukmen", label: "Hükmen sonuçlanan" },
  { value: "eleme", label: "Eleme maçları" },
];

function Select({
  name,
  value,
  options,
  placeholder,
  onChange,
}: {
  name: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{placeholder}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function FixtureFilters({
  groups,
  teams,
  venues,
  weeks,
}: {
  groups: FilterOption[];
  teams: FilterOption[];
  venues: FilterOption[];
  weeks: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("ara") ?? "");

  const current = (key: string) => searchParams.get(key) ?? "";
  const activeCount = ["durum", "grup", "takim", "saha", "hafta", "ara"].filter((k) => current(k)).length;

  function update(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    update("ara", query.trim());
  }

  function clearSearch() {
    setQuery("");
    update("ara", "");
  }

  return (
    <div className="card p-3">
      {/* Takım arama: yazıp Ara'ya basınca o takımın tüm maçları listelenir */}
      <form onSubmit={submitSearch} className="mb-2 flex gap-2" role="search">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Takım ara</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            className="input w-full pl-9"
            placeholder="Takım ara..."
            list="fikstur-takim-listesi"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <datalist id="fikstur-takim-listesi">
            {teams.map((t) => (
              <option key={t.value} value={t.label} />
            ))}
          </datalist>
        </label>
        <button type="submit" className="btn-primary btn-sm shrink-0">
          <Search className="size-3.5" aria-hidden />
          Ara
        </button>
        {current("ara") && (
          <button type="button" className="btn-secondary btn-sm shrink-0" onClick={clearSearch} aria-label="Aramayı temizle">
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </form>

      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-sm font-semibold md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtreler {activeCount > 0 && <span className="badge border-brand-200 bg-brand-50 text-brand-800">{activeCount}</span>}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <div className={cn("grid gap-2 md:grid md:grid-cols-5", open ? "mt-3 grid" : "hidden md:grid")}>
        <Select name="durum" value={current("durum")} options={STATUS_OPTIONS.slice(1)} placeholder="Tüm maçlar" onChange={update} />
        <Select name="grup" value={current("grup")} options={groups} placeholder="Tüm gruplar" onChange={update} />
        <Select name="takim" value={current("takim")} options={teams} placeholder="Tüm takımlar" onChange={update} />
        <Select name="hafta" value={current("hafta")} options={weeks} placeholder="Tüm haftalar" onChange={update} />
        <Select name="saha" value={current("saha")} options={venues} placeholder="Tüm sahalar" onChange={update} />
      </div>

      {activeCount > 0 && (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-brand-700 hover:underline"
          onClick={() => {
            setQuery("");
            router.push(pathname, { scroll: false });
          }}
        >
          Filtreleri temizle
        </button>
      )}
    </div>
  );
}
