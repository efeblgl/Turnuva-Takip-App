/**
 * Sunucu tarafı oturum ve rol yardımcıları.
 * Gerçek güvenlik veritabanı RLS politikalarındadır; buradaki kontroller
 * kullanıcı deneyimi (yönlendirme, menü gizleme) içindir.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Profile, UserRole } from "./types";

export interface SessionInfo {
  userId: string;
  email: string;
  profile: Profile;
}

/** Oturum + profil bilgisini getirir; yoksa null döner. */
export async function getSessionProfile(): Promise<SessionInfo | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return { userId: user.id, email: user.email ?? profile.email, profile: profile as Profile };
}

/** Panel erişimi zorunlu; oturum yoksa girişe, pasifse ana sayfaya yönlendirir. */
export async function requireStaff(): Promise<SessionInfo> {
  const session = await getSessionProfile();
  if (!session) redirect("/giris");
  if (!session.profile.is_active) redirect("/giris?hata=pasif");
  return session;
}

/** Belirli roller zorunlu; yetki yoksa panel ana sayfasına yönlendirir. */
export async function requireRole(roles: UserRole[]): Promise<SessionInfo> {
  const session = await requireStaff();
  if (!roles.includes(session.profile.role)) redirect("/panel?hata=yetki");
  return session;
}

// ---------------------------------------------------------------------------
// Rol yetki matrisi (şartname madde 37)
// ---------------------------------------------------------------------------

export const ROLES_MANAGE_TOURNAMENT: UserRole[] = ["super_admin"];
export const ROLES_MANAGE_TEAMS: UserRole[] = ["super_admin", "tournament_admin"];
export const ROLES_ENTER_SCORES: UserRole[] = ["super_admin", "tournament_admin", "score_officer"];
export const ROLES_MANAGE_ANNOUNCEMENTS: UserRole[] = ["super_admin", "tournament_admin", "content_editor"];
export const ROLES_MANAGE_USERS: UserRole[] = ["super_admin"];
export const ROLES_VIEW_AUDIT: UserRole[] = ["super_admin", "tournament_admin"];

export const can = {
  manageTournament: (r: UserRole) => ROLES_MANAGE_TOURNAMENT.includes(r),
  manageTeams: (r: UserRole) => ROLES_MANAGE_TEAMS.includes(r),
  enterScores: (r: UserRole) => ROLES_ENTER_SCORES.includes(r),
  manageAnnouncements: (r: UserRole) => ROLES_MANAGE_ANNOUNCEMENTS.includes(r),
  editTeamDescription: (r: UserRole) =>
    ROLES_MANAGE_TEAMS.includes(r) || r === "content_editor",
  manageUsers: (r: UserRole) => ROLES_MANAGE_USERS.includes(r),
  viewAudit: (r: UserRole) => ROLES_VIEW_AUDIT.includes(r),
};
