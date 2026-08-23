# Housekit — Mail Templates: Build (BUILD)

> **How to build** the Figma email designs as server-side, bilingual, Django-rendered emails wired to existing triggers.
> **Read first:** `04a-MAIL-REVIEW-AND-PLAN.md` (review, gap analysis, decisions). This doc assumes the **recommended** answers to `04a` §7:
> file-based Django templates (DB for copy/overrides) · EN+SW stacked for customer-facing, single locale for owner-transactional · recipient-locale subject (fallback EN) · Anymail+ESP in prod · text wordmark header + hosted marketing heroes · skip MJML.
> If you chose differently, the only affected phases are noted inline.
> **Backward compatibility rule:** every step keeps the current text-only send working. A template with no HTML file falls back to text — nothing breaks mid-migration.

---

## Phase 0 — Directory layout

```
apps/comms/
  templates/email/
    _tokens.html                 # inline-style values (§2.1 of 04a) as {% with %} vars / macros
    base_transactional.html      # header + body block + reason-line footer (no unsubscribe)
    base_marketing.html          # header + hero slot + body + unsubscribe/preferences footer
    base_internal.html           # compact EN-only operator layout
    partials/
      _header.html   _footer_transactional.html   _footer_marketing.html
      _button.html   _callout.html   _divider.html   _lang_divider.html
      _stat_row.html _payment_summary_card.html    _receipt_block.html
      _overdue_table.html         _contract_summary.html   _signature_confirmation.html
    transactional/  <key>.html    # one file per template key
    tenant/         <key>.html
    billing/        <key>.html
    support/        <key>.html
    security/       <key>.html
    platform/       <key>.html
    operator/       <key>.html
    marketing/      <key>.html
  registry.py                     # NEW — single source of truth (see Phase 3)
  render.py                       # NEW — html render + bilingual assembly (see Phase 1)
```

Register the dir: add `apps/comms/templates` to `TEMPLATES[0]["DIRS"]` **or** rely on app-dirs loader (comms is an installed app, so `templates/` is auto-discovered — confirm `APP_DIRS: True`).

---

## Phase 1 — Engine: make the HTML path work (backward-compatible)

**1.1 `apps/comms/render.py`** — new HTML renderer + bilingual assembly.

```python
from __future__ import annotations
from django.template.loader import render_to_string, select_template
from django.template import TemplateDoesNotExist
from .registry import get_template_meta   # Phase 3

def _html_for(key: str, locale: str, context: dict) -> str | None:
    """Render one language block's HTML from the key's file, or None if absent."""
    meta = get_template_meta(key)
    if not meta:
        return None
    candidates = [f"email/{meta.category}/{key}.html"]
    try:
        tmpl = select_template(candidates)
    except TemplateDoesNotExist:
        return None
    # base is chosen via {% extends %} inside the file; pass locale + ctx
    return tmpl.render({**context, "locale": locale, "meta": meta})

def build_html(key: str, context: dict, locale: str) -> str | None:
    """Full HTML. Bilingual keys stack recipient-locale then the other, via base."""
    meta = get_template_meta(key)
    if not meta:
        return None
    # The per-template file extends a base and renders both blocks when bilingual;
    # we pass the ordered locales so the base emits blocks + KISWAHILI/ENGLISH divider.
    locales = [locale] if not meta.bilingual else _ordered(locale)
    return _html_for(key, locale, {**context, "render_locales": locales})

def _ordered(primary: str) -> list[str]:
    return [primary, "sw" if primary == "en" else "en"]
```

*(Implementation detail: it's simplest to let the **base template** loop `render_locales` and `{% include %}` the per-key body block once per locale, with `_lang_divider.html` between them. Keep the per-key file as a `{% block content %}` that reads `blocks.<locale>` from context — see Phase 2.4.)*

**1.2 `apps/comms/services.py`** — extend `render_template` to also return HTML.

```python
def render_template(key, context, locale="en") -> tuple[str, str, str | None]:
    subject, body_text = _render_subject_and_text(key, context, locale)  # existing logic
    # DB per-row HTML override wins; else file-based; else None (text-only send)
    row = _active_row(key, locale)
    if row and row.body_html:
        html = row.body_html.format_map(_SafeDict(context or {}))
    else:
        from .render import build_html
        html = build_html(key, context, locale)
    return subject, body_text, html
```

Keep the old 2-tuple callers working by making `deliver_email` the only caller of the 3-tuple form (it is).

**1.3 `apps/comms/tasks.py`** — attach the HTML alternative.

```python
subject, body, html = render_template(template_key, context, locale)
msg = EmailMultiAlternatives(subject=subject, body=body,
        from_email=settings.DEFAULT_FROM_EMAIL, to=[...])
if html:
    msg.attach_alternative(html, "text/html")
# attachments loop unchanged
```

**Acceptance:** existing text-only keys still send (html=None). A key with an HTML file now sends multipart/alternative. Verify in dev via the console backend / MailHog.

---

## Phase 2 — Design system, base templates, component partials

**2.1 `_tokens.html`** — the §2.1 values as reusable inline-style strings, e.g.

```django
{% comment %}Usage: {% include "email/_tokens.html" %} then {{ tok.primary }} etc.{% endcomment %}
```
Simpler: define a `tokens` dict in `registry.py` and inject via a context processor so every email has `{{ tok.primary }}`, `{{ tok.ink }}`, `{{ tok.body }}`, `{{ tok.muted }}`, `{{ tok.surface }}`, `{{ tok.hairline }}`, `{{ tok.radius_btn }}`, etc. Inline every style — **no `<style>` blocks, no external CSS, no web fonts** (system stack: `-apple-system, "Helvetica Neue", Arial, sans-serif`).

**2.2 `base_transactional.html`** — 600px centered table, `_header`, `{% block content %}`, `_footer_transactional` (renders `meta.footer_reason` per key, **no unsubscribe**). Include the preheader hidden span.

**2.3 `base_marketing.html`** — as above + optional `{% block hero %}` and `_footer_marketing` (unsubscribe/preferences links, bilingual). `base_internal.html` — minimal EN-only.

**2.4 Bilingual assembly** — the base loops locales:

```django
{% for loc in render_locales %}
  {% if not forloop.first %}{% include "email/partials/_lang_divider.html" with label=loc %}{% endif %}
  {% with b=blocks|dictkey:loc %}{% block content %}{% endblock %}{% endwith %}
{% endfor %}
```
Each per-key file provides `{% block content %}` reading `b.*` (the locale-specific copy + shared data). Copy for each locale comes from the registry/DB; **data** (amounts, names, dates) is shared.

**2.5 Component partials** — build each block from §2.3 of `04a` to match the Figma exactly: `_button` (bulletproof padded `<a>`, `tok.primary` bg, 8px radius), `_payment_summary_card`, `_receipt_block`, `_overdue_table`, `_contract_summary`, `_signature_confirmation`, `_stat_row`, `_callout`, `_divider`, `_lang_divider`. Status colors always paired with the status **word** (accessibility + design rule).

**Acceptance:** `rent_payment_received` (EN) and `tenant_invite` (EN+SW stacked) render pixel-close to Figma in Gmail + Apple Mail.

---

## Phase 3 — Registry, key reconciliation, seed

**3.1 `apps/comms/registry.py`** — one source of truth:

```python
@dataclass(frozen=True)
class TemplateMeta:
    key: str; category: str; base: str          # "base_transactional" | ...
    bilingual: bool; audience: str
    variables: tuple[str, ...]; cta: str | None
    footer_reason: str                            # per-key reason line (EN/SW pair)
    schedule: str | None = None                   # "event" | "beat:overdue" | "drip:day3" ...

REGISTRY: dict[str, TemplateMeta] = { ... all ~55 keys ... }
ALIASES = {"welcome_verify": "client_welcome_verify",
           "user_invite": "caretaker_invite",
           "payment_received": "subscription_payment_received"}

def get_template_meta(key): return REGISTRY.get(ALIASES.get(key, key))
```

**3.2 Aliases & splits** (from `04a` §5): alias legacy keys so the ~22 call-sites keep working untouched; split `lease_signed` → `lease_signed_owner`/`lease_signed_tenant` and `payment_notice_confirmed` → `…_confirmed`/`…_rejected` at the two call-sites that raise them (small, targeted edits).

**3.3 Add the ~29 missing keys** to `DEFAULTS` (text EN/SW) and `REGISTRY`.

**3.4 Update `seed_email_templates`** to upsert subject + text + `variables` + `bilingual` for every registry key in both locales, and to validate 100% coverage (fail if a registry key lacks a text default). Keep it idempotent.

**Acceptance:** `python manage.py seed_email_templates` seeds all keys; a coverage test asserts every `REGISTRY` key resolves in `en` and `sw`.

---

## Phase 4 — Wire event-driven triggers (enrich context)

The ~22 call-sites already fire; several designs need **more context** than they pass today. Audit and enrich each:

| App / call-site | Key | Add to context for the design |
|-----------------|-----|-------------------------------|
| `payments/services.py` | `rent_payment_received` | payment-summary-card fields: method, channel, date, balance_after, status |
| `payments/services.py` | `payment_notice_submitted` / `_confirmed` / `_rejected` | channel, reference, amount, reason |
| `tenancies/leases.py` | `lease_signed_owner`/`_tenant` | signature block: signed_by, signed_at, doc_hash; contract summary |
| `tenancies/services.py` | `new_tenant_owner`, `contract_expiring` | contract summary (parties, unit, rent, term) |
| `billing/services.py` | `invoice_issued`, `subscription_payment_received` | receipt block, amounts, due date |
| `support/services.py` | `ticket_*` + new `ticket_reply` | ticket_no, subject, agent excerpt |
| `accounts`/`users` | `security_*`, `data_export_ready` | device/IP/time, export link |

For **owner-transactional** keep `locale=<recipient>.locale` (single). For **tenant/billing** the recipient-locale still flows in; `bilingual=True` makes the base render both blocks regardless.

**Acceptance:** each enriched email renders its card/table/summary with real data, no blank slots.

---

## Phase 5 — Scheduled families (Celery beat + drip state)

**5.1 Beat tasks** (extend existing beat config): `rent_overdue_digest` (daily), `contract_expiring`/`contract_expiring_tenant` (daily, 30-day window), `trial_ending` (daily), `payment_failed_dunning` (retry cadence), `monthly_owner_digest` (monthly), `op_daily_digest` (daily), `reengagement_inactive` (daily scan, 14-day idle).

**5.2 Onboarding drip** needs per-account enrollment state:

```python
class OnboardingEmail(BaseModel):
    account = FK(Account); step = CharField      # day0/day1/day3/day5/day8
    scheduled_for = DateTimeField; sent_at = DateTimeField(null=True)
```
On signup, enroll the account (create rows for each step). A daily beat task sends due, unsent steps and **skips** a step if its goal is already met (e.g. skip `onboarding_add_property` once a property exists). Same skip-logic for reengagement.

**Acceptance:** a fresh demo account receives day-0 immediately and later steps on schedule; completing a step's goal suppresses that step.

---

## Phase 6 — Assets, preview & QA, tests

**6.1 Assets** — header is a **text wordmark** (bulletproof). Marketing heroes use hosted PNGs at **absolute** URLs (`SITE_URL` + static path) with `width`, `alt`, and a solid bg fallback. Add an `email_asset(path)` helper that returns an absolute URL. No web fonts.

**6.2 Preview harness**
- `python manage.py preview_email --key rent_payment_received --locale sw [--out file.html]` renders with sample context from a fixtures module and writes HTML (or opens MailHog).
- Dev-only Django view `/__email/preview/<key>/<locale>/` gated behind `DEBUG`.
- Sample-context fixtures per key (reused by tests).

**6.3 Tests** (`apps/comms/tests/`)
- Coverage: every `REGISTRY` key renders subject+text+HTML in `en` and `sw` with sample context — **no unrendered `{var}`/`{{ var }}` leaks**.
- Compliance: `base_transactional` output contains **no** unsubscribe link; `base_marketing` **does**; each transactional email contains its `footer_reason`.
- Multipart: `deliver_email` produces a text part **and** an HTML alternative for keys with files; text-only for keys without.
- Bilingual: an EN+SW key contains the `KISWAHILI` divider and both greetings; an EN-only key contains neither.

**Acceptance:** `pytest apps/comms` green; preview renders all keys.

---

## Phase 7 — Deliverability & prod

- **ESP via Anymail** (`django-anymail`) with Postmark or SES: DKIM/SPF/DMARC, bounce/complaint webhooks, **separate message streams** for transactional vs. marketing. Keep `console` in dev, `locmem` in tests.
- **Unsubscribe/preferences** endpoint + token for marketing base (List-Unsubscribe header + one-click). Transactional emails never include it.
- Retries already `max_retries=3`; add per-provider rate-limit handling. Log `key`, `to`, `message-id`.
- DMARC alignment on `DEFAULT_FROM_EMAIL` domain; dedicated subdomain for marketing (e.g. `news.housekit.com`) to protect transactional reputation.

---

## Build order checklist

- [ ] **P1** Engine: 3-tuple `render_template`, `attach_alternative`, `render.py` — text-only still works.
- [ ] **P2** `_tokens`, 3 bases, all component partials; 2 reference templates render to Figma.
- [ ] **P3** `registry.py`, aliases, splits, +29 keys, seed + coverage test.
- [ ] **P4** Enrich the ~22 event call-sites with design context.
- [ ] **P5** Beat tasks + onboarding drip enrollment/state.
- [ ] **P6** Assets helper, preview command + view, fixtures, test suite.
- [ ] **P7** Anymail/ESP, unsubscribe/preferences, DMARC, streams.

## File-by-file change summary

| File | Change |
|------|--------|
| `apps/comms/render.py` | **new** — HTML render + bilingual assembly |
| `apps/comms/registry.py` | **new** — `REGISTRY`, `ALIASES`, `tokens`, `get_template_meta` |
| `apps/comms/services.py` | `render_template` → 3-tuple; DB HTML override; keep text logic |
| `apps/comms/tasks.py` | `attach_alternative(html)` when present |
| `apps/comms/templates.py` | +29 text defaults (EN/SW); split confirmed/rejected copy |
| `apps/comms/templates/email/**` | **new** — bases, partials, per-key files |
| `apps/comms/management/commands/seed_email_templates.py` | seed all keys + `bilingual`/`variables`; coverage guard |
| `apps/comms/management/commands/preview_email.py` | **new** — preview renderer |
| `apps/comms/models.py` | (optional) index on `(key, locale, is_active)`; no schema change required |
| `apps/onboarding` (or `comms`) | **new** `OnboardingEmail` model + daily drip task |
| `config/settings/*` | `TEMPLATES` dir if needed; `SITE_URL`; prod Anymail/ESP env |
| `config/celery beat` | new periodic entries (P5) |
| `apps/{payments,tenancies,billing,support,accounts,users}/…` | enrich call-site context (P4); key alias/splits |
| `apps/comms/tests/**` | **new** — coverage, compliance, multipart, bilingual |

---

*After Phases 1–2 a real HTML email sends end-to-end in dev; the remaining phases widen coverage to all ~55 templates and harden for production. Ping me to start at Phase 1 (or wherever you prefer).*
