# Pilot hardening report — Housekit

Scope: owner, caretaker, tenant and admin (platform console) apps, plus the
backend APIs behind them. The goal was to cut the support calls the pilot is
generating.

## How this was verified

- Ran the real backend (demo seed plus **120 load tenants across 6 houses**) and
  drove the client app in a headless browser: login, search, tenant drawer,
  remove/archive, portfolio, ledger, receipts, caretakers, account page, and a
  full invite flow (open the set-password link → set a password → sign in as
  the caretaker).
- Counted SQL queries per endpoint before and after the backend fix.
- `pnpm -r typecheck`, `pnpm -r build`, `pnpm -r lint` all pass. Backend:
  all 185 existing tests pass, plus 8 new regression tests.

---

## 1. Problems found

### Critical (these generate calls)

| # | Problem | Where |
|---|---------|-------|
| C1 | **Invited caretakers and tenants could never sign in.** Invite and reset emails contain a code and a reference, but no screen anywhere let people enter them. There was no "Forgot password" either. | All client apps |
| C2 | **No search anywhere** for tenants, houses, rooms, the ledger, receipts, expenses or caretakers. | Client app |
| C3 | **Lists silently cut off.** Tenants stopped at 100 (the backend's maximum page size). Houses, compounds, expenses, caretakers and the house dropdowns stopped at **25** (the default page). With more than 25 houses, some never appeared. Older pending payment notices disappeared too. | Client app |
| C4 | **No way to undo mistakes.** You couldn't delete a house or room, remove a tenant, void a payment or expense, undo a move-out, unassign a caretaker or deactivate one. The backend already supported all of these; the UI never offered them. | Client app |
| C5 | **"Move out" happened on a single tap**, with no confirmation and always dated today. One mis-tap vacated a room. | Tenants |
| C6 | **N+1 queries.** At ~120 tenants: ledger **125 queries**, rent charges **203**, leases **103**, houses and compounds one extra query per row. | Backend |

### Important

- There was no account or settings page: owners couldn't change their password or business name.
- Rejecting a payment notice gave the tenant no reason.
- Compound delete used the browser's built-in `window.confirm` dialog: unstyled, untranslated, and easy to tap through on a phone.
- Empty states were generic ("Nothing here yet."), with no next step. Loading was either a blank space or plain grey bars.
- Rooms showed "Occupied" but not *who* lived there.
- Table rows that opened something on click couldn't be reached with the keyboard.
- Several mutations showed **two error toasts**: a local `onError` plus the global error handler.
- The platform console's account list had no search and stopped at 25 accounts.

### Found but not changed (decisions for you or the backend)

1. **The owner can change any staff user's `role`** (`UserSerializer` leaves `role` writable). An owner could make a tenant an owner by mistake. I recommend making `role` read-only.
2. **"Invite to portal" fails for tenants with no email.** The backend says so in a toast, but the UI could ask for an email at that point.
3. **There's no dedicated "change password" endpoint.** The UI uses the emailed-code flow, which is safe and works today. A `POST /auth/password/change` (current + new password) would make it faster.
4. **The platform (admin) realm has no password reset** on the backend, so the console has no "Forgot password".
5. **Ledger pagination:** `/ledger/` returns every active tenancy in one response. That's fine at 100–500 tenants, but worth paginating later.
6. **NIDA reads:** `/residents/` list responses include the full NIDA number for owners, but only *retrieve* calls are audited.

---

## 2. What I changed (frontend — branch `claude/busy-dijkstra-4ojy6f`)

### Data access and search
- `fetchAll()` pages through every result, fetching the remaining pages in parallel. It fixes the 25/100-row truncation on tenants, houses, compounds, expenses, caretakers, notices and the house dropdowns.
- `matchesSearch()` is a forgiving search: it ignores case, accents and extra spaces, matches multiple words ("amina 14"), and matches phone digits ("0712").
- Search added to tenants (name, phone, email, NIDA, room, house, compound), houses, rooms, the ledger, receipts, expenses, caretakers, and platform accounts (searched on the server).
- **Download CSV** (UTF-8, opens in Excel) on tenants, the ledger and expenses.
- Ledger filter chips: All / Not fully paid / Overdue / Paid, with counts.
- Receipts load more on demand ("Load more", "Showing X of Y").

### Letting owners and caretakers fix their own data
- **Tenant drawer**: click any tenant to see everything about them in one place: phone (tap to call), email, NIDA, emergency contact, move-in date, contract end, rent and deposit. From there you can:
  - **Edit details.** Caretakers only ever receive the masked NIDA, so it is never sent back and can't overwrite the real number.
  - **Move out**, with a confirmation dialog and a chosen date.
  - **Undo move-out** (owner).
  - **Remove tenant**, for someone added by mistake. They are moved out today (the room becomes vacant again) and archived. Payments are kept.
  - **Restore** from the new **Archived** tab.
- **Delete room** (owner) and **delete house** (owner). Deleting a house also removes its empty rooms. The backend still refuses anything with tenant or rent history and explains why.
- **Void payment** with a required reason, from Receipts. The receipt is withdrawn and the balance goes back up.
- **Void expense** with a reason.
- **Reject payment notice** with a reason the tenant will see.
- **Caretakers**: unassign from a house (✕ on the badge), deactivate and reactivate, and resend the invite code. The "assign" list hides houses the caretaker already has.
- **Compound delete** now uses the new confirmation dialog instead of `window.confirm`.

### Passwords
- `/forgot-password` and `/set-password` (for invites) in the client app and the tenant portal: enter your email → get a code → set a new password. `?ref=&code=` links fill the form in automatically.
- The login screen now shows "Forgot password?" and "Got an invite email? Set your password".
- New **Account & security** page (`/account`, in the avatar menu): name and phone, business name, change password.
- The tenant portal's Profile page gains "Change password".

### Empty and loading states (designed in Figma first)
- Figma: "Social Empty & Loading States" section on the **✨ Product Experience** page (8 frames).
- New shared components:
  - `Avatar`: colour stays the same per name across every screen.
  - `AvatarStack` and `GhostAvatar`.
  - `PersonCell`: avatar, name and a second line.
  - `PersonRowSkeleton`: a loading placeholder shaped like the real rows.
  - `SearchInput`.
  - `ConfirmDialog`: optional reason field, an avatar slot, and `alertdialog` semantics for screen readers.
- `EmptyState` can show people (avatars and empty-seat placeholders) and a next-step action.
- People are shown with avatars in the tenants, ledger, receipts, notices, caretakers and platform account lists, and rooms show their tenant.
- Every new string has English and Kiswahili text (149 new keys).

### Accessibility
- Clickable rows can now be opened with Tab and Enter.
- Icon-only buttons have `aria-label`s.
- Search fields use `role=searchbox`.
- Error messages are announced to screen readers (`role=alert`).

---

## 3. Backend patch (`backend-n-plus-one.patch`)

I had **read-only** access to `housekit-backend`, so the fix is committed in a
local clone and exported here as a patch. To apply it:

```bash
cd housekit-backend
git am ../housekit_frontend/docs/pilot-hardening/backend-n-plus-one.patch
```

| Endpoint (~120 tenants) | Before | After |
|---|---:|---:|
| `GET /ledger/` | 125 queries | **3** |
| `GET /charges/` | 203 | **3** |
| `GET /leases/` | 103 | **4** |
| `GET /houses/` | 1 per house | **3** |
| `GET /compounds/` | 1 per compound | **3** |
| `/residents/`, `/tenancies/`, `/units/` | 3 | 3 (already fine) |

Changes in the patch:
- `RentCharge.paid_total` is computed in SQL on the list and report views only, via `with_paid_total()`. The pay action still reads a fresh value, so balances are never stale.
- Leases load their signatures in one query.
- House unit counts and compound house counts are computed in the main query instead of once per row.
- Default ordering is set on paginated houses, compounds and assignments, which removes Django's "unordered pagination" warnings.
- Houses can be searched by compound name; tenancies by resident name, phone and room.
- Invite and reset emails now include a **one-tap link** to the new set-password page: the tenant portal for residents, the client app for staff.
- `tests/test_query_counts.py`: 8 tests asserting each list endpoint uses the same number of queries whether it returns few rows or many. These tests fail on the old code (5 endpoints) and pass with the patch.

**About the slow Tenants page.** With SQLite, `/residents/` and `/tenancies/`
were already 3 queries each, so the delay there came from the frontend. The
page made 2 requests capped at 100 rows. The bigger slowdown was on the
dashboard and payments pages, which call `/ledger/` (125 queries). On a
remote MySQL server each query adds a network round-trip, so 125 sequential
queries add up to a visible wait. Both causes are fixed. If Tenants is still
slow in production after the patch, the next thing to check is database
latency.
