import { NotificationsButton, SupportWidget, req, useApi, useAuth } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  AppShell,
  Avatar,
  Button,
  LanguageSwitcher,
  Menu,
  MenuItem,
  type NavItem,
} from "@housekit/ui";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  Users,
  Wallet,
  Wrench,
  FileSignature,
  BarChart3,
  UserCog,
} from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";

interface Account {
  public_id: string;
  business_name: string;
  status: string;
  currency: string;
}

const OWNER_NAV: NavItem[] = [
  { to: "/", label: "nav.dashboard", icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: "/portfolio", label: "nav.portfolio", icon: <Building2 className="h-5 w-5" /> },
  { to: "/tenants", label: "nav.tenants", icon: <Users className="h-5 w-5" /> },
  { to: "/leases", label: "nav.leases", icon: <FileSignature className="h-5 w-5" /> },
  { to: "/payments", label: "nav.payments", icon: <Banknote className="h-5 w-5" /> },
  { to: "/expenses", label: "nav.expenses", icon: <Wallet className="h-5 w-5" /> },
  { to: "/reports", label: "nav.reports", icon: <BarChart3 className="h-5 w-5" /> },
  { to: "/maintenance", label: "nav.maintenance", icon: <Wrench className="h-5 w-5" /> },
  { to: "/caretakers", label: "nav.caretakers", icon: <UserCog className="h-5 w-5" /> },
  { to: "/subscription", label: "nav.subscription", icon: <Receipt className="h-5 w-5" /> },
  { to: "/support", label: "nav.support", icon: <LifeBuoy className="h-5 w-5" /> },
];

const CARETAKER_NAV: NavItem[] = [
  { to: "/", label: "nav.dashboard", icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: "/portfolio", label: "nav.portfolio", icon: <Building2 className="h-5 w-5" /> },
  { to: "/tenants", label: "nav.tenants", icon: <Users className="h-5 w-5" /> },
  { to: "/payments", label: "nav.payments", icon: <Banknote className="h-5 w-5" /> },
  { to: "/maintenance", label: "nav.maintenance", icon: <Wrench className="h-5 w-5" /> },
  { to: "/support", label: "nav.support", icon: <LifeBuoy className="h-5 w-5" /> },
];

export function ClientLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const isOwner = user?.role === "client_admin";

  const account = useQuery({
    queryKey: ["account"],
    enabled: isOwner,
    queryFn: () => req<Account>(api, "GET", "/api/v1/account/"),
  });

  const nav = (isOwner ? OWNER_NAV : CARETAKER_NAV).map((n) => ({ ...n, label: t(n.label) }));
  const suspended = account.data?.status === "suspended";

  return (
    <AppShell
      brand={
        <Link to="/" className="font-display text-lg font-bold text-brand-700">
          {account.data?.business_name ?? "Housekit"}
        </Link>
      }
      nav={nav}
      topRight={
        <>
          <NotificationsButton />
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
        suspended ? (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-overdue-bg px-4 py-2.5 text-sm text-overdue-fg md:px-6">
            <span>{t("subscription.suspendedBody")}</span>
            <Button size="sm" variant="danger" onClick={() => navigate("/subscription")}>
              {t("subscription.payToReactivate")}
            </Button>
          </div>
        ) : null
      }
    >
      <Outlet />
      <SupportWidget />
    </AppShell>
  );
}
