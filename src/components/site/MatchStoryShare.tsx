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

/**
 * Görseli yükler; başarısız olursa (veya hiç yanıt vermezse) null döner,
 * asla reddetmez/askıda kalmaz. Zaman aşımı önemli: bazı ağ koşullarında
 * (ör. Safari/iOS'ta ITP veya zayıf bağlantı) `onload`/`onerror` hiç
 * tetiklenmeyebilir; bu olmadan görsel üretimi süresiz "hazırlanıyor"da kalır.
 */
function loadImage(src: string, timeoutMs = 8000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
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

/**
 * `CanvasRenderingContext2D.roundRect` Safari'de ancak sürüm 16'dan itibaren
 * destekleniyor; eski Safari (ve WebKit tabanlı gömülü tarayıcılar) bu
 * çağrıda "roundRect is not a function" hatasıyla tüm görsel üretimini
 * çökertir. Destek yoksa köşeleri elle çizen bir yedek kullanılır.
 */
function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Deterministik sözde rastgele üreteç (her seferinde aynı desen çıksın diye). */
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
}

/** Yumuşak degrade leke: sis, pus, ışıma ve bulut çizimi için. rgb "r,g,b" biçiminde. */
function softBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: string,
  alpha: number,
  sx = 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  const g = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Küre gölgelemeli, beşgen panelli gerçekçi futbol topu. */
function drawFootball(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  ctx.save();

  // Küre tabanı: sol üstten ışık alan degrade
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  const base = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.5, R * 0.08, cx, cy, R * 1.02);
  base.addColorStop(0, "#eef7f0");
  base.addColorStop(0.4, "#b6c7ba");
  base.addColorStop(0.72, "#6b8072");
  base.addColorStop(1, "#141f18");
  ctx.fillStyle = base;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Merkez beşgen + kenara doğru radyal basılmış 5 beşgen panel
  const pent = (px: number, py: number, pr: number, rot: number, squash: number, dirAng: number) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(dirAng);
    ctx.scale(squash, 1);
    ctx.rotate(rot - dirAng);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const vx = Math.cos(a) * pr;
      const vy = Math.sin(a) * pr;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(10,18,13,0.85)";
    ctx.fill();
    ctx.restore();
  };
  const pcx = cx + R * 0.05;
  const pcy = cy - R * 0.02;
  pent(pcx, pcy, R * 0.3, 0, 1, 0);

  // Dikiş çizgileri: merkez beşgenin köşelerinden dışa doğru
  ctx.strokeStyle = "rgba(9,17,12,0.8)";
  ctx.lineCap = "round";
  ctx.lineWidth = R * 0.036;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.beginPath();
    ctx.moveTo(pcx + Math.cos(a) * R * 0.3, pcy + Math.sin(a) * R * 0.3);
    ctx.quadraticCurveTo(
      pcx + Math.cos(a + 0.09) * R * 0.5,
      pcy + Math.sin(a + 0.09) * R * 0.5,
      pcx + Math.cos(a) * R * 0.64,
      pcy + Math.sin(a) * R * 0.64
    );
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5;
    pent(pcx + Math.cos(a) * R * 0.76, pcy + Math.sin(a) * R * 0.76, R * 0.27, a + Math.PI, 0.48, a);
  }

  // Küre gölgesi (sağ alt) + kenar oklüzyonu
  const sh = ctx.createLinearGradient(cx - R * 0.9, cy - R, cx + R * 0.7, cy + R);
  sh.addColorStop(0, "rgba(255,255,255,0)");
  sh.addColorStop(0.55, "rgba(0,0,0,0.10)");
  sh.addColorStop(1, "rgba(1,8,4,0.78)");
  ctx.fillStyle = sh;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  const ao = ctx.createRadialGradient(cx, cy, R * 0.62, cx, cy, R);
  ao.addColorStop(0, "rgba(0,0,0,0)");
  ao.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = ao;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();

  // Sol üstten yeşilimsi kenar ışığı
  ctx.save();
  ctx.strokeStyle = "rgba(214,255,228,0.45)";
  ctx.lineWidth = R * 0.05;
  ctx.shadowColor = "rgba(134,239,172,0.55)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.965, Math.PI * 1.08, Math.PI * 1.36);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(180,215,192,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
}

/** MAÇ GÜNÜ zemini: koyu yeşil-siyah sinematik atmosfer, top + kırık cam parçaları. */
function drawMatchDayBackground(ctx: CanvasRenderingContext2D): void {
  const cx = W / 2;
  const cy = 895;
  const R = 305;

  // Zemin: koyu yeşilden siyaha
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0f3320");
  bg.addColorStop(0.45, "#0a2415");
  bg.addColorStop(0.8, "#04130a");
  bg.addColorStop(1, "#010704");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Uzakta stadyum ufku + projektörler
  const horizon = 1585;
  const hg = ctx.createLinearGradient(0, horizon - 130, 0, horizon + 40);
  hg.addColorStop(0, "rgba(74,222,128,0)");
  hg.addColorStop(1, "rgba(134,239,172,0.10)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, horizon - 130, W, 170);
  for (const fx of [130, 950]) {
    softBlob(ctx, fx, horizon - 55, 95, "220,245,225", 0.12);
    ctx.fillStyle = "rgba(255,255,245,0.65)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(fx - 21 + i * 14, horizon - 58, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx, horizon - 50);
    ctx.lineTo(fx, horizon);
    ctx.stroke();
  }

  // Saha dokusu: ufuk altı perspektifli biçme şeritleri + orta yuvarlak izi
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, W, H - horizon);
  ctx.clip();
  for (let k = -5; k < 6; k++) {
    if ((k + 10) % 2 === 0) continue;
    ctx.fillStyle = "rgba(163,230,183,0.035)";
    ctx.beginPath();
    ctx.moveTo(cx, horizon);
    ctx.lineTo(cx + k * 230, H + 80);
    ctx.lineTo(cx + (k + 1) * 230, H + 80);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, horizon + 1);
  ctx.lineTo(W, horizon + 1);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.ellipse(cx, horizon + 95, 220, 46, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Orta yuvarlak halkaları: zeminde hafif saha izi
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 3;
  for (const rr of [720, 880]) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sis ve pus katmanları
  softBlob(ctx, 140, 1500, 300, "134,197,160", 0.06);
  softBlob(ctx, 950, 1440, 320, "134,197,160", 0.05);
  softBlob(ctx, cx, 1700, 430, "110,180,140", 0.06);
  softBlob(ctx, 60, 620, 260, "134,197,160", 0.045);
  softBlob(ctx, 1020, 740, 280, "134,197,160", 0.045);
  softBlob(ctx, cx, 260, 320, "255,255,255", 0.03);

  // Hafif çapraz hareket çizgileri
  ctx.save();
  ctx.rotate(-0.16);
  for (const [ly, lh, la] of [
    [430, 3, 0.06],
    [700, 18, 0.028],
    [935, 2.5, 0.05],
    [1215, 26, 0.022],
    [1450, 3, 0.055],
    [1655, 2, 0.045],
  ] as const) {
    ctx.fillStyle = `rgba(255,255,255,${la})`;
    ctx.fillRect(-220, ly, W + 720, lh);
  }
  ctx.restore();

  // İnce yeşil ışık huzmeleri
  const streak = (sy: number, ang: number, alpha: number, sw: number) => {
    ctx.save();
    ctx.translate(0, sy);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(-200, 0, W + 400, 0);
    g.addColorStop(0, "rgba(74,222,128,0)");
    g.addColorStop(0.5, `rgba(110,231,153,${alpha})`);
    g.addColorStop(1, "rgba(74,222,128,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-200, -sw / 2, W + 620, sw);
    ctx.restore();
  };
  streak(392, -0.14, 0.3, 4);
  streak(700, 0.12, 0.18, 6);
  streak(1178, 0.16, 0.26, 4);
  streak(1332, 0.15, 0.18, 6);
  streak(1540, 0.2, 0.22, 3);

  // Topun arkasındaki yeşil ışıma + top
  softBlob(ctx, cx, cy, 520, "34,197,94", 0.16);
  drawFootball(ctx, cx, cy, R);

  // Camdan çatlak çizgileri (top çevresinden dışa)
  const rnd = lcg(11);
  ctx.strokeStyle = "rgba(205,250,225,0.2)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35 + (rnd() - 0.5) * 0.4;
    let d = R * 1.02;
    let aa = a;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    for (let s = 0; s < 3; s++) {
      aa += (rnd() - 0.5) * 0.5;
      d += R * (0.12 + rnd() * 0.16);
      ctx.lineTo(cx + Math.cos(aa) * d, cy + Math.sin(aa) * d);
    }
    ctx.stroke();
  }

  // Kontrollü kırık cam parçaları: iç ucu topa bakan, dışa doğru genişleyen kıymıklar
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
    const d0 = R * (1.05 + rnd() * 0.3);
    const len = R * (0.22 + rnd() * 0.5);
    const wHalf = 9 + rnd() * 17;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const px = -sinA;
    const py = cosA;
    const x0 = cx + cosA * d0;
    const y0 = cy + sinA * d0;
    const x1 = cx + cosA * (d0 + len);
    const y1 = cy + sinA * (d0 + len);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 + px * wHalf, y1 + py * wHalf);
    ctx.lineTo(x1 + px * wHalf * 0.2 + cosA * len * 0.24, y1 + py * wHalf * 0.2 + sinA * len * 0.24);
    ctx.lineTo(x1 - px * wHalf, y1 - py * wHalf);
    ctx.closePath();
    ctx.fillStyle = `rgba(190,242,208,${0.05 + rnd() * 0.08})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(215,255,235,${0.14 + rnd() * 0.2})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // Daha uzağa savrulmuş küçük kırıklar
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2;
    const d = R * (1.5 + rnd() * 0.8);
    const s = 5 + rnd() * 12;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.8, y + s * 0.5);
    ctx.lineTo(x - s * 0.7, y + s * 0.4);
    ctx.closePath();
    ctx.fillStyle = `rgba(200,245,215,${0.06 + rnd() * 0.1})`;
    ctx.fill();
  }

  // Süzülen minik parçacıklar
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W;
    const y = 260 + rnd() * 1420;
    const r = 1 + rnd() * 2.4;
    const c =
      i % 4 === 0
        ? `rgba(74,222,128,${0.15 + rnd() * 0.25})`
        : i % 4 === 1
          ? `rgba(187,247,208,${0.12 + rnd() * 0.22})`
          : `rgba(255,255,255,${0.08 + rnd() * 0.18})`;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Skor/VS bölgesinin zemini sakin kalsın diye merkez karartması
  const core = ctx.createRadialGradient(cx, 885, 40, cx, 885, 330);
  core.addColorStop(0, "rgba(2,10,5,0.38)");
  core.addColorStop(1, "rgba(2,10,5,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, W, H);

  // Kenar karartması (vinyet)
  const vin = ctx.createRadialGradient(cx, H / 2, 470, cx, H / 2, 1260);
  vin.addColorStop(0, "rgba(0,0,0,0)");
  vin.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vin;
  ctx.fillRect(0, 0, W, H);
}

/** MAÇ SONUCU zemini: siyah-füme-koyu kırmızı, sinematik stadyum ambiyansı. */
function drawResultBackground(ctx: CanvasRenderingContext2D): void {
  const rnd = lcg(29);

  // Zemin: siyah-füme, alta doğru kırmızımsı ısınan geçiş
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a0a0d");
  bg.addColorStop(0.45, "#131316");
  bg.addColorStop(0.78, "#1a1417");
  bg.addColorStop(1, "#0b0709");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Bulutlu sinematik gökyüzü (üst bölge)
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W;
    const y = 90 + rnd() * 620;
    const r = 130 + rnd() * 190;
    softBlob(ctx, x, y, r, i % 3 === 0 ? "52,52,62" : "34,34,42", i % 3 === 0 ? 0.4 : 0.5, 1.9);
    if (i % 3 === 1) softBlob(ctx, x + 40, y + r * 0.42, r * 0.6, "120,32,32", 0.13, 2.1);
  }

  // Yönlü ışık hüzmeleri
  const beam = (bx: number, topW: number, ang: number, color: string) => {
    ctx.save();
    ctx.translate(bx, -70);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, 0, 1500);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-topW / 2, 0);
    ctx.lineTo(topW / 2, 0);
    ctx.lineTo(topW * 1.7, 1500);
    ctx.lineTo(-topW * 1.7, 1500);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  beam(250, 120, 0.2, "rgba(235,230,228,0.06)");
  beam(830, 130, -0.24, "rgba(235,230,228,0.055)");
  beam(540, 90, 0.02, "rgba(205,80,68,0.05)");

  // Tribünler: ortası yukarı kavisli üç kademe
  const rimTop = 1235;
  const tierH = 135;
  const bandPath = (yTop: number, hgt: number) => {
    ctx.beginPath();
    ctx.moveTo(-60, yTop + 80);
    ctx.quadraticCurveTo(W / 2, yTop - 80, W + 60, yTop + 80);
    ctx.lineTo(W + 60, yTop + 80 + hgt);
    ctx.quadraticCurveTo(W / 2, yTop - 80 + hgt, -60, yTop + 80 + hgt);
    ctx.closePath();
  };
  // Çatı üstünde sıcak ışık taşması (stat çanağının parıltısı)
  softBlob(ctx, W / 2, rimTop - 50, 480, "150,60,50", 0.07, 2.2);
  const tierTones = ["#17171d", "#1d1d24", "#22222a"];
  for (let t = 0; t < 3; t++) {
    bandPath(rimTop + t * tierH, tierH + 8);
    ctx.fillStyle = tierTones[t] ?? "#17171d";
    ctx.fill();
  }

  // Kalabalık dokusu: seyirci noktaları + tek tük kırmızı/sıcak ışık (ortada seyrek)
  for (let t = 0; t < 3; t++) {
    const yTop = rimTop + t * tierH;
    for (let i = 0; i < 240; i++) {
      const x = rnd() * (W + 120) - 60;
      const tt = (x + 60) / 1200;
      const yc = yTop + 80 - 320 * tt * (1 - tt);
      const y = yc + 6 + rnd() * (tierH - 14);
      const centerFade = Math.abs(x - W / 2) < 260 ? 0.5 : 1;
      const roll = rnd();
      ctx.fillStyle =
        roll > 0.965
          ? `rgba(239,90,80,${0.42 * centerFade})`
          : roll > 0.93
            ? `rgba(255,238,214,${0.3 * centerFade})`
            : `rgba(205,205,220,${(0.07 + rnd() * 0.1) * centerFade})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + rnd() * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Çatı hattı + kademeler arasında kısık kırmızı LED şeritleri (ortada sönük)
  const curveStroke = (yTop: number) => {
    ctx.beginPath();
    ctx.moveTo(-60, yTop + 80);
    ctx.quadraticCurveTo(W / 2, yTop - 80, W + 60, yTop + 80);
  };
  ctx.strokeStyle = "rgba(255,255,255,0.17)";
  ctx.lineWidth = 2.5;
  curveStroke(rimTop);
  ctx.stroke();
  const stripGrad = ctx.createLinearGradient(0, 0, W, 0);
  stripGrad.addColorStop(0, "rgba(220,38,38,0.62)");
  stripGrad.addColorStop(0.32, "rgba(220,38,38,0.15)");
  stripGrad.addColorStop(0.68, "rgba(220,38,38,0.15)");
  stripGrad.addColorStop(1, "rgba(220,38,38,0.62)");
  ctx.save();
  ctx.strokeStyle = stripGrad;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "rgba(220,38,38,0.55)";
  ctx.shadowBlur = 18;
  curveStroke(rimTop + tierH);
  ctx.stroke();
  curveStroke(rimTop + tierH * 2);
  ctx.stroke();
  ctx.restore();

  // Çatı üstünde yumuşak projektörler (kenarlarda, yazılardan uzakta)
  for (const fx of [64, 1016]) {
    const fy = 1120;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx, fy + 12);
    ctx.lineTo(fx, fy + 150);
    ctx.stroke();
    softBlob(ctx, fx, fy, 100, "255,240,224", 0.16);
    ctx.fillStyle = "rgba(255,250,238,0.75)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(fx - 21 + (i % 4) * 14, fy - 7 + Math.floor(i / 4) * 13, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // En altta saha: koyu zemin + perspektifli biçme izleri + taç çizgisi kavisi
  const pitchTop = rimTop + tierH * 3;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-60, pitchTop + 80);
  ctx.quadraticCurveTo(W / 2, pitchTop - 80, W + 60, pitchTop + 80);
  ctx.lineTo(W + 60, H);
  ctx.lineTo(-60, H);
  ctx.closePath();
  const pg = ctx.createLinearGradient(0, pitchTop - 40, 0, H);
  pg.addColorStop(0, "#121a14");
  pg.addColorStop(1, "#05080a");
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.clip();
  for (let k = -5; k < 6; k++) {
    if ((k + 10) % 2 === 0) continue;
    ctx.fillStyle = "rgba(255,255,255,0.022)";
    ctx.beginPath();
    ctx.moveTo(W / 2, pitchTop - 40);
    ctx.lineTo(W / 2 + k * 240, H + 100);
    ctx.lineTo(W / 2 + (k + 1) * 240, H + 100);
    ctx.closePath();
    ctx.fill();
  }
  softBlob(ctx, 120, 1800, 240, "210,90,70", 0.05);
  softBlob(ctx, 960, 1780, 240, "210,90,70", 0.05);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(W / 2, pitchTop + 150, 260, 52, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Kısık kırmızı duman
  softBlob(ctx, 110, 1330, 300, "136,26,26", 0.12);
  softBlob(ctx, 970, 1300, 320, "136,26,26", 0.11);
  softBlob(ctx, 320, 1560, 260, "120,24,24", 0.1);
  softBlob(ctx, 760, 1600, 280, "120,24,24", 0.09);
  softBlob(ctx, 40, 860, 240, "110,22,22", 0.08, 1.4);
  softBlob(ctx, 1040, 900, 250, "110,22,22", 0.08, 1.4);
  softBlob(ctx, W / 2, 1210, 380, "130,26,26", 0.07, 2);

  // Yazı bölgeleri temiz kalsın: orta kolon ve skor çevresi karartması
  const col = ctx.createLinearGradient(0, 0, W, 0);
  col.addColorStop(0, "rgba(0,0,0,0)");
  col.addColorStop(0.3, "rgba(0,0,0,0)");
  col.addColorStop(0.43, "rgba(0,0,0,0.24)");
  col.addColorStop(0.57, "rgba(0,0,0,0.24)");
  col.addColorStop(0.7, "rgba(0,0,0,0)");
  col.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = col;
  ctx.fillRect(0, 1140, W, 640);
  const core = ctx.createRadialGradient(W / 2, 900, 60, W / 2, 900, 340);
  core.addColorStop(0, "rgba(0,0,0,0.34)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, W, H);

  // Skor bölgesi arkasında kısılmış "etki" halkaları + ışın kırıkları
  ctx.save();
  ctx.shadowColor = "rgba(220,38,38,0.5)";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(248,113,113,0.17)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(W / 2, 900, 255, -0.15 * Math.PI, 0.6 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = "rgba(248,113,113,0.11)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, 900, 335, 0.75 * Math.PI, 1.25 * Math.PI);
  ctx.stroke();
  ctx.restore();
  const ring = ctx.createRadialGradient(W / 2, 900, 210, W / 2, 900, 430);
  ring.addColorStop(0, "rgba(190,44,38,0)");
  ring.addColorStop(0.5, "rgba(190,44,38,0.09)");
  ring.addColorStop(1, "rgba(190,44,38,0)");
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.22;
    const d0 = 275 + rnd() * 40;
    const d1 = d0 + 28 + rnd() * 56;
    ctx.beginPath();
    ctx.moveTo(W / 2 + Math.cos(a) * d0, 900 + Math.sin(a) * d0 * 0.86);
    ctx.lineTo(W / 2 + Math.cos(a) * d1, 900 + Math.sin(a) * d1 * 0.86);
    ctx.stroke();
  }

  // Havada süzülen toz, kıymık ve kor parçacıkları
  for (let i = 0; i < 34; i++) {
    const x = rnd() * W;
    const y = 240 + rnd() * 1450;
    const a = rnd() * Math.PI;
    const len = 5 + rnd() * 13;
    ctx.strokeStyle = `rgba(230,230,238,${0.05 + rnd() * 0.1})`;
    ctx.lineWidth = 1 + rnd();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W;
    const y = 300 + rnd() * 1400;
    const r = 1 + rnd() * 2.2;
    const c =
      i % 3 === 0
        ? `rgba(248,113,113,${0.14 + rnd() * 0.3})`
        : i % 3 === 1
          ? `rgba(251,180,140,${0.1 + rnd() * 0.2})`
          : `rgba(255,255,255,${0.07 + rnd() * 0.16})`;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kenar karartması (vinyet)
  const vin = ctx.createRadialGradient(W / 2, H / 2, 460, W / 2, H / 2, 1260);
  vin.addColorStop(0, "rgba(0,0,0,0)");
  vin.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vin;
  ctx.fillRect(0, 0, W, H);
}

async function drawStory(canvas: HTMLCanvasElement, p: MatchStoryProps): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");

  // document.fonts bazı eski/gömülü WebKit tarayıcılarında yok olabilir;
  // varsa da nadir durumlarda hiç çözülmeyebilir — her ikisi de görselin
  // süresiz "hazırlanıyor" durumunda kalmasına yol açmasın diye zaman
  // aşımıyla sınırlanır.
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.race([
      document.fonts.ready.catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  }
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  canvas.dataset.font = font;

  const [belediye, kaymakamlik, homeLogo, awayLogo] = await Promise.all([
    loadImage("/logo-belediye.jpg"),
    loadImage("/logo-kaymakamlik.jpg"),
    p.home?.logoUrl ? loadImage(p.home.logoUrl) : Promise.resolve(null),
    p.away?.logoUrl ? loadImage(p.away.logoUrl) : Promise.resolve(null),
  ]);

  // Arka plan: maç günü ve maç sonucu için ayrı sinematik sahneler.
  // Ön plandaki tüm öğeler (logolar, yazılar, rozetler, skor, alt bilgi) aynen korunur.
  if (p.played) drawResultBackground(ctx);
  else drawMatchDayBackground(ctx);

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
  if (p.played) {
    // Maç sonucu şeridi kırmızı (sonuç görselinin kırmızı temasıyla uyumlu)
    lg.addColorStop(0, "#991b1b");
    lg.addColorStop(0.5, "#ef4444");
    lg.addColorStop(1, "#991b1b");
  } else {
    lg.addColorStop(0, "#15803d");
    lg.addColorStop(0.5, "#22c55e");
    lg.addColorStop(1, "#15803d");
  }
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
    safeRoundRect(ctx, 190, cardY, W - 380, 240, 28);
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
  // Paylaşılacak dosya, render tamamlanır tamamlanmaz burada hazır tutulur
  // (bkz. share() içindeki not: Safari'de navigator.share() bir kullanıcı
  // jestinden sonra await ile geciktirilirse "kullanıcı jesti gerekli"
  // hatasıyla reddedilir; bu yüzden dosya ÖNCEDEN üretilmiş olmalı).
  const fileRef = useRef<File | null>(null);

  const fileName = `mac-${props.played ? "sonucu" : "gunu"}.png`;

  const render = useCallback(async () => {
    setBusy(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      canvasRef.current = canvas;
      await drawStory(canvas, props);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      fileRef.current = blob ? new File([blob], fileName, { type: "image/png" }) : null;
      setPreview(canvas.toDataURL("image/png"));
    } catch {
      toast.error("Görsel oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }, [props, fileName]);

  function openModal() {
    setOpen(true);
    if (!preview) void render();
  }

  /**
   * ÖNEMLİ (Safari/iOS uyumluluğu): navigator.share() yalnızca kullanıcı
   * jestiyle (tıklama) aynı senkron çağrı zincirinde çağrılırsa çalışır.
   * Dosyayı burada (tıklama anında) canvas.toBlob ile üretmek WebKit'te
   * "Must be handling a user gesture" hatasına yol açar çünkü toBlob
   * gerçek bir asenkron işlemdir ve jest bu bekleme sırasında düşer.
   * Bu yüzden dosya render() sırasında (modal açılışında) önceden
   * üretilir; burada yalnızca senkron biçimde navigator.share çağrılır.
   */
  function share() {
    const file = fileRef.current;
    if (!file) {
      download();
      return;
    }
    const data = { files: [file], title: "Maç Sonucu" };
    if (typeof navigator.canShare === "function" && navigator.canShare(data)) {
      navigator.share(data).catch(() => {
        /* kullanıcı vazgeçti veya paylaşım reddedildi */
      });
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
