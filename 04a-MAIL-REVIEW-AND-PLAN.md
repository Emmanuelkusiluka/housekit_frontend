# Housekit — Mail Templates: Design Review & Implementation Plan (PLAN)

> **What this is.** A review of the finished Figma email designs and a plan for turning them into **server-side Django-rendered, bilingual (EN+SW) emails** wired to the triggers the backend already fires.
> **Companions:** `04-MAIL-TEMPLATES-PLAN-AND-BUILD.md` (the design brief that *produced* the Figma), `00` §10 (comms), `01` §15 / `01a` §J (template-key registry), `02a` (voice & tone).
> **Build steps live in:** `04b-MAIL-BUILD.md`. This doc is the *why/what*; that doc is the *how*.
> **Scope of this round:** review + plan only. No code yet — you approve, then I build.

---

## 0. Source reviewed

- **Figma file:** `housekit` — page **"Mail templates"** (canvas `67:448`), design-system panel titled **"Housekit — Email system"** (`77:1214`).
- Reviewed: the foundations/design-system panel, the shared block library, the base templates, and a representative sample of assembled templates (e.g. `tenant_invite` `77:23`). Layer names carry the real copy and a `{Audience} / {slug} / {locales}` convention, so the full inventory below is drawn from the file itself.
- **Note:** you're mid-rename, so a couple of node IDs shifted during review — the *structure* is stable and is what this plan is built on, not any single node ID.

---

## 1. Headline finding — this was designed for email HTML, not the web

The design-system panel states it outright:

> *"Every frame is **table-based, inline-styled, 600px, system-font** — send-ready patterns, not web layout."*

This is the best possible starting point. It means the designs map **directly** onto server-side Django HTML email templates with **no MJML/Maizzle build step required** — the table + inline-style patterns are already email-safe. We hand-write Django HTML partials that mirror the Figma blocks. (MJML remains optional if we later want authoring convenience; it is **not** needed to ship.)

---

## 2. What's in the design (review)

### 2.1 Design system — extracted tokens

| Group | Token | Value |
|-------|-------|-------|
| Brand | primary | `#4b45c6` |
| | primary-press | `#3a34a8` |
| | primary-tint | `#eeedfb` |
| Neutrals | ink (headings) | `#222222` |
| | body | `#3f3f3f` |
| | muted (meta) | `#6a6a6a` |
| | surface-soft (cards) | `#f7f7f7` |
| | canvas / hairline | `#ffffff` / `#dddddd` |
| Status (always paired with a word) | paid | green · `Paid` |
| | overdue | red · `Overdue` |
| | partial | amber · `Partial` |
| | vacant / maintenance | neutral/slate · `Vacant` / `Maintenance` |
| | pending review | violet · `Pending review` |
| Type (Helvetica / Arial / system) | Title | 24 / 700 |
| | Section | 18 / 600 |
| | Body | 16 / 400 |
| | Meta | 13 / 400 |
| Shape | button / card / pill | 8px / 14px / full |
| Grid | width / outer padding | 600px, single column / 24px |

### 2.2 Three base templates (confirmed in file)

| Base | Chrome | Footer | Used by |
|------|--------|--------|---------|
| **`base_transactional`** | Wordmark header, body slot, one CTA. "No hero, no marketing chrome." | Support email + help centre, business address, a **specific "You received this because…" reason line**, PDPA/"Data & privacy" line. **No unsubscribe.** | Owner/caretaker transactional, tenant/resident, billing, support, account & security |
| **`base_marketing`** | Header + hero + multi-section body | **"Email preferences · Unsubscribe / Jiondoe"** + Data & privacy (bilingual) | Newsletter, educational, lifecycle/onboarding drip |
| **`base_internal`** (operator) | Compact, plain, EN-only, no marketing chrome | Minimal | Platform-ops alerts (`op_*`) |

Each transactional email carries its **own** footer reason ("You received this because a payment was recorded for…", "…because your landlord invited this address…", etc.) — ~37 distinct reason strings observed. This is a deliberate, compliance-aware touch (transactional = explain the reason, no unsubscribe; marketing = unsubscribe + preferences).

### 2.3 Component / block library (build once, compose everywhere)

Header · Footer (transactional + marketing variants) · Button (primary filled / secondary outline) · Callout/warning (tinted) · Divider · **StatRow** (e.g. `18/20 Occupied · TZS 3.24M Collected · TZS 540K Overdue`) · **PaymentSummaryCard** (amount + method + date + balance + status pill) · **ReceiptBlock** (receipt no., tenant, unit, period, amount, "Download PDF receipt") · **OverdueTable** (tenant·unit · amount · days late + total outstanding) · **ContractSummary** (parties, unit, monthly rent, term) · **SignatureConfirmation** (signed-by, timestamp, document hash, "copy attached").

These match `04` §5 one-for-one — the designer delivered the full set.

### 2.4 Bilingual pattern — **both languages in one send**

The header block is annotated **"EN + SW in one send."** Confirmed on `tenant_invite`: the email renders the **English** block, then a **`KISWAHILI`** divider label, then the **Kiswahili** block — one email, both languages stacked. Meanwhile the **owner/caretaker transactional** set is tagged **EN-only**.

**The rule the file encodes:** language is chosen **per template category**, not only per recipient —
- **EN-only** (owner transactional): owners set a language in-app, so send their single locale.
- **EN+SW stacked** (tenant/resident, billing, newsletter, educational, lifecycle): recipient's preference is often unknown or mixed, so send both.

This is the single biggest gap vs. the current backend (see §4) and the most important decision in §7.

---

## 3. Full template inventory (~55 variants across 9 audiences)

Legend: **Base** T = `base_transactional`, M = `base_marketing`, I = `base_internal`. **Loc** = languages in the send. ⊕ = new key vs. the original `01`/`01a` registry.

### A. Owner / caretaker transactional — Base T, Loc EN
`client_welcome_verify` · `password_reset` · `caretaker_invite` · `rent_payment_received` · `rent_overdue_digest` · `payment_notice_submitted` ⊕ · `maintenance_reported` ⊕ · `new_tenant_owner` · `contract_expiring` · `unit_vacated` · `lease_signed_owner` · `lease_declined_owner` ⊕  *(12)*

### B. Tenant / resident portal — Base T, Loc EN+SW
`tenant_invite` ⊕ · `tenant_complete_profile` ⊕ · `lease_ready_sign` · `lease_signed_tenant` · `rent_reminder_tenant` · `rent_receipt` · `payment_notice_confirmed` ⊕ · `payment_notice_rejected` ⊕ · `contract_expiring_tenant` ⊕ · `maintenance_update_tenant` ⊕  *(10)*

### C. Billing — Base T, Loc EN+SW, **no unsubscribe**
`trial_ending` · `invoice_issued` · `subscription_payment_received` ⊕ · `payment_failed_dunning` · `account_suspended` · `account_reactivated` · `plan_upgraded` ⊕  *(7)*

### D. Support (client-facing) — Base T, Loc EN+SW
`ticket_received` · `ticket_reply` ⊕ · `ticket_resolved` · `ticket_reopened`  *(4)*

### E. Account & security — Base T
`security_new_login` ⊕ · `security_password_changed` ⊕ · `security_email_changed` ⊕ · `data_export_ready` ⊕  *(4)*

### F. Platform → client — Base T
`application_approved` (Your account is ready) · `application_rejected` (About your application)  *(2)*

### G. Operator / internal alerts — Base I, Loc EN
`op_new_application` ⊕ · `op_new_signup` ⊕ · `op_payment_failed_alert` ⊕ · `op_bug_report` ⊕ · `op_ticket_escalated` ⊕ · `op_churn_risk` ⊕ · `op_daily_digest` ⊕  *(7)*

### H. Newsletter & educational — Base M, Loc EN+SW, **unsubscribe**
`newsletter_monthly` ⊕ · `product_changelog` ⊕ · `edu_series` ×3 topics ⊕ (5 habits of organized landlords · Keeping NIDA data safe · Rent on time with mobile money)  *(5)*

### I. Lifecycle / onboarding drip — Base M, Loc EN+SW
`onboarding_day0_welcome` (Day 0) · `onboarding_add_property` (Day 1) · `onboarding_invite_caretaker` (Day 3) · `onboarding_first_payment` (Day 5) · `onboarding_reports` (Day 8) · `reengagement_inactive` (14d idle) · `monthly_owner_digest` (monthly) · `feature_announcement` (on release)  *(8)*

---

## 4. How it maps to the current backend (gap analysis)

**What already exists and works** (`apps/comms/`):

- `EmailTemplate(key, locale, subject, body_text, body_html, variables, is_active)` — unique on `(key, locale)`. `body_html` column exists but is **empty/unused**.
- `render_template(key, ctx, locale)` → `(subject, body_text)`; DB row overrides built-in `DEFAULTS`; `str.format_map` with a `_SafeDict` (missing var → blank, never raises).
- `send_email()` → enqueues Celery `deliver_email` → builds `EmailMultiAlternatives` and sends.
- `seed_email_templates` management command seeds `DEFAULTS` into the DB.
- **~22 live `send_email()` call-sites** across `payments`, `tenancies`, `leases`, `residents`, `properties`, `accounts`, `support`, `users`, `billing`, `platform_admin`.
- **Locale is already resolved per-recipient** at every call-site (`owner.locale`, `account.locale`, `resident.account.locale`, `user.locale`).
- Backends: `console` (dev), `smtp` (prod); `locmem` (tests). `DEFAULT_FROM_EMAIL` set. No ESP/Anymail yet.

**Gaps to close (this is the build):**

| # | Gap | Impact |
|---|-----|--------|
| 1 | `deliver_email` never calls `attach_alternative(html, "text/html")` | HTML would never send even if it existed |
| 2 | `render_template` returns text only; ignores `body_html` | No HTML path at all |
| 3 | No HTML templates, base layouts, or component partials exist | Nothing to render |
| 4 | **Bilingual stacking not modeled** — `locale=` picks ONE language | Contradicts the "EN+SW in one send" design |
| 5 | Placeholder styles differ: text defaults use `{var}` (str.format); Django HTML uses `{{ var }}` | Need one shared context that satisfies both |
| 6 | **Key drift** + ~29 missing keys (see §5) | Call-sites and design slugs don't line up |
| 7 | No email asset/image strategy (logo, absolute URLs) | Logo/hero won't render in clients |
| 8 | No preview or cross-client QA harness | Can't verify a 55×2 matrix by eye |
| 9 | Several designs need **richer context** than call-sites pass today (contract summary, receipt fields, stat rows) | Templates would render half-empty |
| 10 | Onboarding drip / digests need **scheduling & enrollment state** (Celery beat) | Lifecycle set can't fire |

---

## 5. Key reconciliation (backend key → design slug)

Existing backend keys need aliasing to the design slugs so call-sites keep working while templates use the design names:

| Backend key (today) | Design slug | Action |
|---------------------|-------------|--------|
| `welcome_verify` | `client_welcome_verify` | alias |
| `user_invite` | `caretaker_invite` | alias |
| `payment_received` (billing) | `subscription_payment_received` | alias |
| `lease_signed` | `lease_signed_owner` **+** `lease_signed_tenant` | split into two |
| `payment_notice_confirmed` | `payment_notice_confirmed` **+** `payment_notice_rejected` | split (confirmed vs rejected) |
| `ticket_escalated` | `op_ticket_escalated` (audience = operator) | reclassify |
| `rent_receipt`, `rent_reminder_tenant`, others | same | keep |

**Add these ⊕ keys** (not yet in `DEFAULTS`): `tenant_invite, tenant_complete_profile, contract_expiring_tenant, maintenance_update_tenant, payment_notice_rejected, ticket_reply, subscription_payment_received, plan_upgraded, onboarding_day0_welcome, onboarding_add_property, onboarding_invite_caretaker, onboarding_first_payment, onboarding_reports, reengagement_inactive, monthly_owner_digest, feature_announcement, newsletter_monthly, product_changelog, edu_series(×topics), security_new_login, security_password_changed, security_email_changed, data_export_ready, op_new_application, op_new_signup, op_payment_failed_alert, op_bug_report, op_churn_risk, op_daily_digest`.

---

## 6. Recommended architecture

### 6.1 Rendering — file-based Django templates (hybrid with DB)

- **Structure & design in files** (version-controlled, code-reviewed): `apps/comms/templates/email/` with `base_transactional.html`, `base_marketing.html`, `base_internal.html`, a `partials/` component library, a `_tokens` include for the inline-style values from §2.1, and one file per template that `{% extends %}` a base and `{% include %}` partials. This is the natural home for table-based, inline-styled HTML and gives us Django template inheritance for free.
- **Copy & control in the DB** (`EmailTemplate`): subject, preheader, plain-text body, documented `variables`, `is_active`, and an **optional** per-row `body_html` override for one-off edits without a deploy. Files are the default; DB HTML overrides only when present.
- **Text part** stays `str.format` from `DEFAULTS`/DB (unchanged); **HTML part** renders via `render_to_string` with the **same context dict** — `{var}` for text, `{{ var }}` for HTML, one context satisfies both.

### 6.2 Bilingual

- A per-key registry flag `bilingual: true|false`. Base template renders the recipient-locale block first, then — if `bilingual` — a `KISWAHILI`/`ENGLISH` divider and the second block. EN-only keys render one block (current behaviour preserved).
- Subject line for bilingual sends: **recipient-locale subject when known, else EN** (small decision — see §7).

### 6.3 Send pipeline (unchanged shape, extended)

```
service/signal → send_email(key, to, ctx, locale)
      → Celery deliver_email
            → render_template()  →  subject + text + html
            → EmailMultiAlternatives(text) .attach_alternative(html) .send()
```

Scheduled families (overdue digest, contract-expiring, trial-ending, dunning, onboarding drip, reengagement, monthly digest, `op_daily_digest`) run on **Celery beat**; onboarding drip needs a small **per-account enrollment/state** table so each step fires once at the right day.

---

## 7. Decisions I need from you

1. **Rendering home** — file-based Django templates with DB for copy/overrides (my recommendation, §6.1), or DB-stored `body_html` you edit in admin? *(Recommend file-based.)*
2. **Bilingual scope** — stack EN+SW for all customer-facing emails per the design, and send owner-transactional in the owner's single locale? Or always send the recipient's single saved locale? *(Recommend: follow the design — stacked for tenant/billing/marketing, single for owner transactional.)*
3. **Bilingual subject line** — recipient-locale subject, or combined `EN · SW`? *(Recommend recipient-locale, fallback EN.)*
4. **Prod ESP** — stay on raw SMTP, or add **Anymail** + a provider (Postmark / SES / Mailgun) for DKIM/bounce handling and separate transactional vs. marketing streams? *(Recommend Anymail + Postmark or SES.)*
5. **Logo/hero images** — text wordmark only (bulletproof, zero hosting), or hosted PNG at an absolute URL with alt fallback? *(Recommend text wordmark for header; hosted images only in marketing heroes.)*
6. **Operator alerts** — which internal inbox/distribution receives the `op_*` alerts?
7. **MJML** — confirm we skip it (designs are already email-safe) and hand-write Django partials. *(Recommend skip.)*

---

## 8. Documentation deliverables (what I'll produce alongside the build)

1. **Template catalog** — every key: audience, base, locales, trigger, CTA, variables, sample context. (Generated from the registry so it can't drift.)
2. **Design-system reference** — the §2.1 tokens as the canonical inline-style values.
3. **Component/partial reference** — each block: props/context, screenshot, usage.
4. **"Add a new email" contributor guide** — registry entry → template file → text default → wire trigger → preview → test.
5. **Preview & QA guide** — how to preview any key/locale, the cross-client test matrix, sample fixtures.
6. **Deliverability runbook** — SPF/DKIM/DMARC, ESP config, transactional vs. marketing streams, unsubscribe/preference handling, bounce/complaint flow.

---

## 9. Phasing (detailed steps in `04b-MAIL-BUILD.md`)

1. **Engine** — HTML path through `render_template` + `deliver_email` (backward-compatible).
2. **Design system + 3 bases + component partials.**
3. **Registry + key reconciliation + missing keys + seed.**
4. **Wire event-driven triggers** (enrich call-site context).
5. **Scheduled families** (Celery beat + onboarding enrollment).
6. **Assets/images + preview & QA harness + tests.**
7. **Deliverability & prod ESP.**

Each phase is independently shippable; after Phase 1+2 a real HTML email (e.g. `rent_payment_received`) sends end-to-end in dev.

---

*Review complete. Approve the §7 decisions (or just say "go with your recommendations") and I'll start the build per `04b`.*
