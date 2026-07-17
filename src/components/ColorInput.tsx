"use client";

/**
 * Renk seçici: görsel seçici + hex kodu girişi (şartname madde 8).
 * Boş bırakılabilir; boşsa sistem varsayılan rengi kullanır.
 */
import { useState } from "react";
import { X } from "lucide-react";

export function ColorInput({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#9CA3AF";

  return (
    <div>
      <label className="label" htmlFor={`${name}-hex`}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} için renk seçici`}
          value={pickerValue}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className="h-11 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1"
        />
        <input
          id={`${name}-hex`}
          type="text"
          inputMode="text"
          placeholder="Örn. #F97316"
          value={value}
          onChange={(e) => {
            let v = e.target.value.trim().toUpperCase();
            if (v && !v.startsWith("#")) v = `#${v}`;
            setValue(v);
          }}
          className="input max-w-36 font-mono text-xs uppercase"
          maxLength={7}
        />
        {value && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setValue("")}
            aria-label={`${label} rengini temizle`}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
