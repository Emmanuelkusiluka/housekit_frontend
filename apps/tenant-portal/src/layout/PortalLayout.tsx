import { NotificationsButton, useAuth } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { AppShell, Avatar, LanguageSwitcher, Menu, MenuItem, type NavItem } from "@housekit/ui";
import { FileSignature, Receipt, User, Wallet } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";

export function PortalLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nav: NavItem[] = [
    { to: "/", label: t("nav.myLease"), icon: <FileSignature className="h-5 w-5" />, end: true },
    { to: "/payments", label: t("nav.myPayments"), icon: <Wallet className="h-5 w-5" /> },
    { to: "/receipts", label: t("nav.receipts"), icon: <Receipt className="h-5 w-5" /> },
    { to: "/profile", label: t("nav.profile"), icon: <User className="h-5 w-5" /> },
  ];

  return (
    <AppShell
      brand={
        <Link to="/" className="font-display text-lg font-bold text-brand-700">
          Housekit
        </Link>
      }
      nav={nav}
      topRight={
        <>
          <NotificationsButton />
          <LanguageSwitcher />
          <Menu
            trigger={
              <button className="rounded-full" aria-label={t("ux.accountMenu")}>
                <Avatar name={user?.full_name ?? "?"} />
              </button>
            }
          >
            <div className="px-3 py-2 text-sm">
              <p className="font-medium text-ink">{user?.full_name}</p>
              <p className="text-xs text-ink-muted">{user?.email}</p>
            </div>
            <MenuItem onSelect={() => navigate("/profile")}>{t("ux.accountSettings")}</MenuItem>
            <MenuItem danger onSelect={() => logout()}>
              {t("common.signOut")}
            </MenuItem>
          </Menu>
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}
