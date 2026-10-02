import { useAuth } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { AppShell, Avatar, Button, LanguageSwitcher, Menu, MenuItem, type NavItem } from "@housekit/ui";
import { Building2, CreditCard, Inbox, LifeBuoy, Mail as MailIcon } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export function ConsoleLayout() {
  const { t } = useTranslation();
  const { user, logout, operatorAccount, setOperatorAccount } = useAuth();

  const nav: NavItem[] = [
    { to: "/", label: t("platform.applications"), icon: <Inbox className="h-5 w-5" />, end: true },
    { to: "/accounts", label: t("nav.accounts"), icon: <Building2 className="h-5 w-5" /> },
    { to: "/support", label: t("nav.support"), icon: <LifeBuoy className="h-5 w-5" /> },
    { to: "/billing", label: t("nav.billing"), icon: <CreditCard className="h-5 w-5" /> },
    { to: "/mail", label: "Mail", icon: <MailIcon className="h-5 w-5" /> },
  ];

  return (
    <AppShell
      brand={
        <Link to="/" className="font-display text-lg font-bold text-brand-700">
          Housekit <span className="text-ink-subtle">Admin</span>
        </Link>
      }
      nav={nav}
      topRight={
        <>
          <span className="hidden text-xs text-ink-muted sm:inline">{user?.role}</span>
          <LanguageSwitcher />
          <Menu
            trigger={
              <button className="rounded-full">
                <Avatar name={user?.full_name ?? "?"} />
              </button>
            }
          >
            <div className="px-3 py-2 text-sm">
              <p className="font-medium text-ink">{user?.full_name}</p>
              <p className="text-xs text-ink-muted">{user?.email}</p>
            </div>
            <MenuItem danger onSelect={() => logout()}>
              {t("common.signOut")}
            </MenuItem>
          </Menu>
        </>
      }
      banner={
        operatorAccount ? (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-partial-bg px-4 py-2.5 text-sm text-partial-fg md:px-6">
            <span>👁️ {t("platform.impersonate")} — {operatorAccount}</span>
            <Button size="sm" variant="outline" onClick={() => setOperatorAccount(null)}>
              {t("platform.stopImpersonating")}
            </Button>
          </div>
        ) : null
      }
    >
      <Outlet />
    </AppShell>
  );
}
