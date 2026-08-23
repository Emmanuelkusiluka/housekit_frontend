# Housekit — Frontend (`housekit-frontend`)

Four React apps + shared packages, built on top of the Housekit API (see
`housekit-backend`). Every screen is a journey lane from the board, mapped to a
real endpoint.

**Stack:** React + TypeScript + Vite · Tailwind + a code-first design system ·
TanStack Query · React Router · React Hook Form + Zod · react-i18next (EN + SW).
Monorepo via **pnpm + Turborepo**.

> Note: `02-FRONTEND-BUILD.md` asks to load a `frontend-design` skill for token
> guidance. That skill isn't installed in this environment, so the design system
> in `packages/ui` was authored directly — a disciplined token set (brand indigo,
> the §10 status-color contract, one `<Money>`/date util, mobile-first shell).

## Layout

```
apps/
  marketing/        housekit.com          public site, pricing, "talk to us" (AccountApplication)
  client-app/       my.housekit.com       Owner + Caretaker (client realm)
  tenant-portal/    tenants.housekit.com  Resident (client realm)
  platform-console/ admin.housekit.com    Super Admin + Support (platform realm)
packages/
  ui/               design tokens + components (shared by all apps)
  api-client/       typed client generated from the backend OpenAPI schema
  auth/             two-realm token handling, refresh, route guards
  i18n/             EN + SW dictionaries + hooks
  app-kit/          shared providers, generic login, global error→toast, notifications, support widget
```

## Getting started

```bash
pnpm install
pnpm gen:api                 # regenerate the typed client from packages/api-client/openapi.json
pnpm -r typecheck            # all packages + apps
pnpm -r build                # build all four apps

# Run one app against a local backend (see housekit-backend):
pnpm --filter @housekit/client-app dev      # my.  → :5174
pnpm --filter @housekit/tenant-portal dev   # tenants → :5175
pnpm --filter @housekit/platform-console dev # admin → :5176
pnpm --filter @housekit/marketing dev       # public → :5173
```

Each app reads `VITE_API_URL` (default `http://localhost:8000`); see `.env.example`.
Log in with the demo credentials printed by the backend's `seed_demo`
(`owner@demo.housekit.test` / `Passw0rd!`).

## How it holds together

- **Two realms** (`packages/auth`): `my.`/`tenants.` use the client realm
  (`/api/v1/auth/*`); the console uses the platform realm
  (`/api/v1/platform/auth/*`). Tokens are stored separately per realm, refreshed
  silently on 401, and never shared. A wrong-realm token bounces to that app's
  login.
- **Typed API client** (`packages/api-client`): generated from the backend
  OpenAPI schema with `openapi-typescript` + `openapi-fetch`. Regenerate with
  `pnpm gen:api` after any API change.
- **Global error envelope** (`packages/app-kit`): `{ error: { code, message } }`
  is mapped centrally — `upgrade_required` → upgrade modal, `account_suspended` →
  suspended banner + pay-to-reactivate, `wrong_token_audience`/401 → login.
- **Status colors are a product feature** (`packages/ui/status.tsx`): one
  `StatusPill` binds charge/unit/lease/ticket/account statuses to the brief's
  green/red/amber/slate contract.
- **Mobile-first**: `AppShell` is a sidebar on desktop and a bottom-nav on
  mobile; `DataTable` collapses to stacked cards. Loading (skeletons), empty
  states, and errors are handled on every data screen; payment recording is
  optimistic.
- **i18n from day one**: every string via `t()`; EN + SW dictionaries with a
  language switcher in all shells.

## Journey → screen → endpoint

| Lane | App | Endpoints |
|------|-----|-----------|
| Onboarding / Portfolio setup | client-app | `auth/signup`, `houses`, `units`, `caretaker-assignments` |
| Tenants & Leases | client-app | `residents`, `tenancies`, `leases/{id}/generate`, `residents/{id}/verify` |
| Rent collection | client-app | `ledger`, `charges/{id}/pay`, `receipts`, `payment-notices/{id}/confirm` |
| Reports / Expenses | client-app | `reports/*`, `expenses` |
| Maintenance | client-app / tenant-portal | `maintenance`, `maintenance/{id}/set_status` |
| Caretaker mode | client-app | scoped `units`/`tenancies`/`payments` + `maintenance` |
| Lease signing | tenant-portal | `portal/leases/{id}/sign` \| `/decline` |
| Tenant payments | tenant-portal | `portal/payment-notices`, `portal/receipts`, `portal/profile` |
| Client onboarding | platform-console | `apply`, `platform/applications/{id}/provision` |
| Resolution | platform-console | `platform/tickets/*` (assign/reply/resolve/escalate), impersonation |
| Account lifecycle | platform-console | `platform/accounts/{id}/suspend\|activate`, `platform/invoices/{id}/mark_paid` |
