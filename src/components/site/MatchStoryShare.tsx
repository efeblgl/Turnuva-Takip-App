"use client";

/**
 * Maç sonucu / maç günü için Instagram hikayesi (1080x1920) görseli üretir.
 * Görsel tarayıcıda canvas ile çizilir; kullanıcı önizlemeyi görüp
 * "Paylaş" (mobil paylaşım menüsü -> Instagram) veya "İndir" diyebilir.
 * Ek paket kullanılmaz.
 */
import { useCallback, useRef, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";

export interface StoryTeam {
  name: string;
  code: string | null;
  color: string | null;
  logoUrl: string | null;
}

export interface MatchStoryProps {
  tournamentName: string;
  roundLabel: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string | null;
  played: boolean;
  homeScore: number | null;
  awayScore: number | null;
  homePen: number | null;
  awayPen: number | null;
  home: StoryTeam | null;
  away: StoryTeam | null;
  homeScorers: string[];
  awayScorers: string[];
}

const W = 1080;
const H = 1920;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Metni verilen genişliğe sığacak şekilde satırlara böler. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Logoyu veya renkli kod rozetini daire içinde çizer. */
function drawTeamBadge(
  ctx: CanvasRenderingContext2D,
  team: StoryTeam | null,
  logo: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();
  if (logo) {
    // Oranı koruyarak daireye sığdır (contain)
    const scale = Math.min((r * 1.8) / logo.width, (r * 1.8) / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = team?.color ?? "#374151";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(r * 0.62)}px ${ctx.canvas.dataset.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(team?.code ?? "?", cx, cy + r * 0.04);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 6;
  ctx.stroke();
}

/** #rrggbb -> rgba(...) */
function rgba(hex: string | null | undefined, alpha: number, fallback = "#16a34a"): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  const v = parseInt(m ? m[1] : fallback.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

/** Deterministik sözde rastgele üreteç (her seferinde aynı desen çıksın diye). */
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
}

async function drawStory(canvas: HTMLCanvasElement, p: MatchStoryProps): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");

  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  canvas.dataset.font = font;

  const [belediye, kaymakamlik, homeLogo, awayLogo] = await Promise.all([
    loadImage("/logo-belediye.jpg"),
    loadImage("/logo-kaymakamlik.jpg"),
    p.home?.logoUrl ? loadImage(p.home.logoUrl) : Promise.resolve(null),
    p.away?.logoUrl ? loadImage(p.away.logoUrl) : Promise.resolve(null),
  ]);

  const homeColor = p.home?.color ?? "#16a34a";
  const awayColor = p.away?.color ?? "#2563eb";

  // Zemin: koyu yeşil dikey geçiş
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#14532d");
  bg.addColorStop(0.55, "#0d3b22");
  bg.addColorStop(1, "#031a0d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Takım renklerinde çapraz ışık huzmeleri
  const beam = (color: string, y: number, flip: boolean) => {
    ctx.save();
    ctx.translate(flip ? W : 0, y);
    ctx.rotate(flip ? 0.16 : -0.16);
    const g = ctx.createLinearGradient(0, 0, flip ? -1600 : 1600, 0);
    g.addColorStop(0, rgba(color, 0.55));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(flip ? -1600 : -100, -140, 1700, 300);
    ctx.restore();
  };
  beam(homeColor, 620, false);
  beam(awayColor, 1240, true);

  // Çapraz hız çizgileri
  ctx.save();
  ctx.rotate(-0.16);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (const [ly, lh] of [[520, 22], [1030, 12], [1385, 30], [1660, 10]] as const) {
    ctx.fillRect(-200, ly, W + 700, lh);
  }
  ctx.restore();

  // Dağınık parıltı noktaları (deterministik)
  const rnd = lcg(7);
  for (let i = 0; i < 42; i++) {
    const x = rnd() * W;
    const y = 320 + rnd() * 1250;
    const r = 2 + rnd() * 5;
    const c = i % 3 === 0 ? rgba(homeColor, 0.5) : i % 3 === 1 ? rgba(awayColor, 0.5) : "rgba(255,255,255,0.28)";
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orta ışıma + saha yuvarlağı dekoru
  const glow = ctx.createRadialGradient(W / 2, 900, 90, W / 2, 900, 640);
  glow.addColorStop(0, "rgba(255,255,255,0.12)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 3;
  for (const r of [740, 900]) {
    ctx.beginPath();
    ctx.arc(W / 2, 900, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Kenar karartması (vinyet)
  const vin = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1250);
  vin.addColorStop(0, "rgba(0,0,0,0)");
  vin.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vin;
  ctx.fillRect(0, 0, W, H);

  // Üst: kurum logoları
  drawTeamBadge(ctx, null, belediye, 170, 190, 95);
  drawTeamBadge(ctx, null, kaymakamlik, W - 170, 190, 95);

  // Turnuva adı (iki satıra kadar)
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `700 44px ${font}`;
  const nameLines = wrapText(ctx, p.tournamentName.toLocaleUpperCase("tr"), 520);
  nameLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, W / 2, 170 + i * 56);
  });
  ctx.font = `500 30px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("YIĞILCA", W / 2, 170 + Math.min(nameLines.length, 2) * 56 + 8);
  ctx.shadowColor = "transparent";

  // Etiket: eğik şerit üzerinde MAÇ SONUCU / MAÇ GÜNÜ
  const label = p.played ? "MAÇ SONUCU" : "MAÇ GÜNÜ";
  ctx.font = `800 46px ${font}`;
  const labelW = ctx.measureText(label).width + 120;
  ctx.save();
  ctx.translate(W / 2, 500);
  ctx.rotate(-0.035);
  const lg = ctx.createLinearGradient(-labelW / 2, 0, labelW / 2, 0);
  lg.addColorStop(0, "#15803d");
  lg.addColorStop(0.5, "#22c55e");
  lg.addColorStop(1, "#15803d");
  ctx.fillStyle = lg;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  // Paralelkenar şerit
  ctx.moveTo(-labelW / 2 + 18, -52);
  ctx.lineTo(labelW / 2 + 18, -52);
  ctx.lineTo(labelW / 2 - 18, 52);
  ctx.lineTo(-labelW / 2 - 18, 52);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, 0, 16);
  ctx.restore();

  ctx.font = `600 32px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(p.roundLabel, W / 2, 618);

  // Takımlar
  const homeX = 250;
  const awayX = W - 250;
  const badgeY = 880;
  drawTeamBadge(ctx, p.home, homeLogo, homeX, badgeY, 132);
  drawTeamBadge(ctx, p.away, awayLogo, awayX, badgeY, 132);

  // Kazanan tacı
  if (p.played && p.homeScore !== null && p.awayScore !== null) {
    const hs = p.homeScore + (p.homePen ?? 0) * 0.001;
    const as = p.awayScore + (p.awayPen ?? 0) * 0.001;
    if (hs !== as) {
      ctx.font = "78px serif";
      ctx.fillText("🏆", hs > as ? homeX : awayX, badgeY - 165);
    }
  }

  // Takım adları (gölgeli)
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 44px ${font}`;
  const nameOf = (t: StoryTeam | null) => t?.name ?? "Belirlenecek";
  wrapText(ctx, nameOf(p.home), 380).slice(0, 3).forEach((l, i) => {
    ctx.fillText(l, homeX, badgeY + 210 + i * 52);
  });
  wrapText(ctx, nameOf(p.away), 380).slice(0, 3).forEach((l, i) => {
    ctx.fillText(l, awayX, badgeY + 210 + i * 52);
  });
  ctx.shadowColor = "transparent";

  // Skor / VS (eğik, gölgeli, enerjik)
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  if (p.played && p.homeScore !== null && p.awayScore !== null) {
    ctx.font = `italic 800 165px ${font}`;
    const sg = ctx.createLinearGradient(0, badgeY - 120, 0, badgeY + 60);
    sg.addColorStop(0, "#ffffff");
    sg.addColorStop(1, "#bbf7d0");
    ctx.fillStyle = sg;
    ctx.fillText(`${p.homeScore}-${p.awayScore}`, W / 2, badgeY + 58);
    ctx.shadowColor = "transparent";
    if (p.homePen !== null && p.awayPen !== null) {
      ctx.font = `600 34px ${font}`;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(`Penaltılar: ${p.homePen} - ${p.awayPen}`, W / 2, badgeY + 128);
    }
  } else {
    ctx.font = `italic 800 130px ${font}`;
    const vg = ctx.createLinearGradient(0, badgeY - 110, 0, badgeY + 40);
    vg.addColorStop(0, "#ffffff");
    vg.addColorStop(1, "#bbf7d0");
    ctx.fillStyle = vg;
    ctx.fillText("VS", W / 2, badgeY + 42);
    ctx.shadowColor = "transparent";
  }
  ctx.restore();

  if (p.played && (p.homeScorers.length > 0 || p.awayScorers.length > 0)) {
    // Golcüler
    const scorersTop = 1330;
    ctx.font = `700 36px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("⚽ GOLLER", W / 2, scorersTop);

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, scorersTop + 30);
    ctx.lineTo(W / 2, scorersTop + 30 + Math.max(p.homeScorers.length, p.awayScorers.length, 1) * 46);
    ctx.stroke();

    ctx.font = `500 32px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const list = (items: string[], x: number, align: CanvasTextAlign) => {
      ctx.textAlign = align;
      items.slice(0, 6).forEach((s, i) => ctx.fillText(s, x, scorersTop + 70 + i * 46));
      if (items.length > 6) ctx.fillText(`+${items.length - 6} gol daha`, x, scorersTop + 70 + 6 * 46);
    };
    list(p.homeScorers, W / 2 - 50, "right");
    list(p.awayScorers, W / 2 + 50, "left");
    ctx.textAlign = "center";
  } else if (!p.played) {
    // Oynanmamış maç: tarih-saat bloğu ortayı doldurur
    const cardY = 1330;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(190, cardY, W - 380, 240, 28);
    ctx.fill();
    ctx.stroke();
    ctx.font = `800 76px ${font}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(p.timeLabel, W / 2, cardY + 105);
    ctx.font = `600 40px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(p.dateLabel, W / 2, cardY + 175);
  }

  // Alt bilgi
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(140, 1700);
  ctx.lineTo(W - 140, 1700);
  ctx.stroke();

  ctx.font = `600 34px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const meta = [p.dateLabel, p.timeLabel, p.venueName].filter(Boolean).join("  ·  ");
  ctx.fillText(meta, W / 2, 1762);

  ctx.font = `500 28px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillText("Yığılca Belediyesi · Yığılca Kaymakamlığı", W / 2, 1814);

  ctx.font = `500 24px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("Tasarım: Efe Baloğlu", W / 2, 1862);
}

export function MatchStoryShare(props: MatchStoryProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const render = useCallback(async () => {
    setBusy(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      canvasRef.current = canvas;
      await drawStory(canvas, props);
      setPreview(canvas.toDataURL("image/png"));
    } catch {
      toast.error("Görsel oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }, [props]);

  function openModal() {
    setOpen(true);
    if (!preview) void render();
  }

  const fileName = `mac-${props.played ? "sonucu" : "gunu"}.png`;

  async function toFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    return blob ? new File([blob], fileName, { type: "image/png" }) : null;
  }

  async function share() {
    const file = await toFile();
    if (!file) return;
    const data = { files: [file], title: "Maç Sonucu" };
    if (typeof navigator.canShare === "function" && navigator.canShare(data)) {
      try {
        await navigator.share(data);
      } catch {
        /* kullanıcı vazgeçti */
      }
    } else {
      download();
      toast.info("Bu tarayıcı doğrudan paylaşımı desteklemiyor; görsel indirildi. İndirilen görseli Instagram hikayenize ekleyebilirsiniz.");
    }
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = fileName;
    a.click();
  }

  return (
    <>
      <button type="button" className="btn-secondary btn-sm" onClick={openModal}>
        <Share2 className="size-3.5" aria-hidden />
        {props.played ? "Sonucu Paylaş" : "Maçı Paylaş"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Instagram Hikayesi">
        <div className="space-y-3">
          {busy || !preview ? (
            <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl bg-gray-100">
              <Loader2 className="size-6 animate-spin text-muted" aria-hidden />
              <span className="sr-only">Görsel hazırlanıyor</span>
            </div>
          ) : (
            /* Canvas çıktısı: statik önizleme görseli */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Maç paylaşım görseli önizlemesi"
              className="mx-auto w-full max-w-64 rounded-xl border border-line"
            />
          )}
          <p className="text-center text-xs text-muted">
            &quot;Paylaş&quot; ile açılan menüden Instagram&apos;ı seçin; ya da görseli indirip
            hikayenize ekleyin.
          </p>
          <div className="flex justify-center gap-2">
            <button type="button" className="btn-primary btn-sm" disabled={!preview} onClick={share}>
              <Share2 className="size-3.5" aria-hidden />
              Paylaş
            </button>
            <button type="button" className="btn-secondary btn-sm" disabled={!preview} onClick={download}>
              <Download className="size-3.5" aria-hidden />
              İndir
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
