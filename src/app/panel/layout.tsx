import { requireStaff, can } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { PanelShell, type PanelNavItem } from "@/components/panel/PanelNav";
import { ROLE_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const role = session.profile.role;

  const items: PanelNavItem[] = [
    { href: "/panel", label: "Genel Bakış", icon: "home" },
  ];

  if (can.manageTournament(role)) {
    items.push({ href: "/panel/turnuva", label: "Turnuva Ayarları", icon: "trophy" });
  }
  if (can.manageTeams(role) || role === "viewer" || role === "content_editor" || role === "score_officer") {
    items.push(
      { href: "/panel/takimlar", label: "Takımlar", icon: "shield" },
      { href: "/panel/oyuncular", label: "Oyuncular", icon: "user" },
      { href: "/panel/gruplar", label: "Gruplar", icon: "users" }
    );
  }
  if (can.manageTeams(role)) {
    items.push({ href: "/panel/fikstur-olustur", label: "Fikstür Oluştur", icon: "calendarPlus" });
  }
  items.push({ href: "/panel/maclar", label: "Maçlar ve Skorlar", icon: "calendar" });
  items.push({ href: "/panel/puan-durumu", label: "Puan Durumu", icon: "list" });
  if (can.manageTeams(role)) {
    items.push({ href: "/panel/eleme", label: "Eleme Aşaması", icon: "target" });
  }
  items.push({ href: "/panel/gol-kralligi", label: "Gol Krallığı", icon: "target" });
  if (can.manageTeams(role)) {
    items.push({ href: "/panel/cezalar", label: "Kartlar ve Cezalar", icon: "gavel" });
  }
  if (can.manageAnnouncements(role)) {
    items.push({ href: "/panel/duyurular", label: "Duyurular", icon: "megaphone" });
  }
  if (can.manageTeams(role)) {
    items.push({ href: "/panel/sahalar", label: "Sahalar", icon: "book" });
  }
  if (can.manageUsers(role)) {
    items.push({ href: "/panel/kullanicilar", label: "Kullanıcılar", icon: "users" });
  }
  if (can.viewAudit(role)) {
    items.push({ href: "/panel/islem-gecmisi", label: "İşlem Geçmişi", icon: "clipboard" });
  }
  if (can.manageTournament(role)) {
    items.push({ href: "/panel/ayarlar", label: "Sistem Ayarları", icon: "settings" });
  }

  return (
    <PanelShell
      items={items}
      userLabel={session.profile.full_name ?? session.email}
      roleLabel={ROLE_LABELS[role]}
      signOut={signOutAction}
    >
      {children}
    </PanelShell>
  );
}
