"use client";

/**
 * Supabase Storage'a görsel yükleme alanı (şartname madde 41).
 * Yüklenen dosyanın herkese açık URL'si gizli input ile forma eklenir.
 */
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUpload({
  name,
  bucket,
  defaultUrl,
  label,
  hint = "JPG, PNG veya WEBP - en fazla 5 MB. Kare görsel önerilir.",
}: {
  name: string;
  bucket: string;
  defaultUrl?: string | null;
  label: string;
  hint?: string;
}) {
  const [url, setUrl] = useState<string>(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Bu dosya türü desteklenmiyor. JPG, PNG veya WEBP yükleyin.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Dosya çok büyük. En fazla 5 MB yükleyebilirsiniz.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        toast.error(`Görsel yüklenemedi: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setUrl(data.publicUrl);
      toast.success("Görsel yüklendi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        {url ? (
          <img
            src={url}
            alt="Yüklenen görsel ön izlemesi"
            className="size-16 rounded-xl border border-line bg-white object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-xl border border-dashed border-line text-gray-300">
            <ImagePlus className="size-6" aria-hidden />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {uploading ? "Yükleniyor..." : url ? "Değiştir" : "Görsel seç"}
            </button>
            {url && (
              <button
                type="button"
                className="btn-ghost btn-sm text-red-600"
                onClick={() => setUrl("")}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Kaldır
              </button>
            )}
          </div>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
