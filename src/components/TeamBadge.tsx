/**
 * Takım göstergeleri: renk rozeti, logo ve isim.
 * Renk tek başına bilgi taşımaz; takım adı her zaman yanındadır (erişilebilirlik).
 */
/* eslint-disable @next/next/no-img-element */
import { cn, readableTextOn, teamColor } from "@/lib/utils";

export function TeamColorDot({
  color,
  className,
}: {
  color: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full border border-black/10", className)}
      style={{ backgroundColor: teamColor(color) }}
    />
  );
}

export function TeamLogo({
  logoUrl,
  name,
  color,
  code,
  size = 32,
}: {
  logoUrl: string | null | undefined;
  name: string;
  color: string | null | undefined;
  code?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logosu`}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-line bg-white object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const bg = teamColor(color);
  const initials = (code ?? name).slice(0, 2).toLocaleUpperCase("tr");
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full border border-black/10 font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: readableTextOn(bg),
        fontSize: Math.max(10, size * 0.34),
      }}
    >
      {initials}
    </span>
  );
}

export function TeamLabel({
  name,
  color,
  logoUrl,
  code,
  size = 24,
  bold,
  className,
}: {
  name: string;
  color: string | null | undefined;
  logoUrl?: string | null;
  code?: string | null;
  size?: number;
  bold?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <TeamLogo logoUrl={logoUrl} name={name} color={color} code={code} size={size} />
      <span className={cn("min-w-0 break-words leading-tight", bold ? "font-semibold" : "font-medium")}>
        {name}
      </span>
    </span>
  );
}
