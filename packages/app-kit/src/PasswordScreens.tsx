import { HousekitError } from "@housekit/api-client";
import { useAuth } from "@housekit/auth";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, CardHeader, CardTitle, Field, Input, LanguageSwitcher } from "@housekit/ui";
import { CheckCircle2, Eye, EyeOff, KeyRound, MailCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { req } from "./api";

/* The client realm's reset flow emails a one-time *code* plus a *reference*
 * (the user's public id). The same flow is used to:
 *   • reset a forgotten password,
 *   • finish an invite (caretakers and tenants are created without a password),
 *   • change your password while signed in.
 * Before this screen existed there was nowhere to type the code, so invited
 * caretakers/tenants could never sign in. */

function errorText(err: unknown, fallback: string): string {
  if (err instanceof HousekitError) {
    const d = err.details as Record<string, unknown>;
    const first = Object.values(d ?? {}).flat()[0];
    if (typeof first === "string") return first;
    return err.message || fallback;
  }
  return fallback;
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "new-password",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={8}
        required
        className="pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("ux.hidePassword") : t("ux.showPassword")}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-muted hover:bg-canvas"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Code + new password form. `reference` may be prefilled (signed-in user, link). */
function SetPasswordForm({
  reference: initialRef,
  code: initialCode,
  hideReference,
  onDone,
  submitLabel,
}: {
  reference?: string;
  code?: string;
  hideReference?: boolean;
  onDone: () => void;
  submitLabel: string;
}) {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [reference, setReference] = useState(initialRef ?? "");
  const [code, setCode] = useState(initialCode ?? "");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError(t("ux.passwordTooShort"));
    if (pw !== pw2) return setError(t("ux.passwordsDontMatch"));
    setLoading(true);
    try {
      await req(api, "POST", "/api/v1/auth/password/reset/confirm", {
        body: { public_id: reference.trim(), token: code.trim(), new_password: pw },
      });
      onDone();
    } catch (err) {
      setError(errorText(err, t("common.somethingWrong")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {!hideReference && (
        <Field label={t("ux.reference")} htmlFor="ref" hint={t("ux.referenceHint")}>
          <Input id="ref" required autoComplete="off" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      )}
      <Field label={t("ux.code")} htmlFor="code" hint={t("ux.codeHint")}>
        <Input id="code" required autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
      </Field>
      <Field label={t("ux.newPassword")} htmlFor="pw" hint={t("ux.passwordRule")}>
        <PasswordInput id="pw" value={pw} onChange={setPw} />
      </Field>
      <Field label={t("ux.confirmPassword")} htmlFor="pw2">
        <PasswordInput id="pw2" value={pw2} onChange={setPw2} />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-overdue">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}

function AuthFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="mb-6 text-center">
        <p className="font-display text-2xl font-bold text-brand-700">Housekit</p>
        <p className="mt-1 text-sm text-ink-muted">{t("common.tagline")}</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardBody>{children}</CardBody>
      </Card>
    </div>
  );
}

/**
 * `/forgot-password` and `/set-password` (invite). Step 1 asks for the email
 * and sends the code; step 2 takes code + new password. If the URL carries
 * `?ref=…&code=…` (e.g. from a future email link) it jumps straight to step 2.
 */
export function PasswordResetScreen({ mode = "reset", loginPath = "/login" }: { mode?: "reset" | "invite"; loginPath?: string }) {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [params] = useSearchParams();
  const preRef = params.get("ref") ?? undefined;
  const preCode = params.get("code") ?? undefined;
  const [step, setStep] = useState<"email" | "code" | "done">(preRef || mode === "invite" ? "code" : "email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await req(api, "POST", "/api/v1/auth/password/reset", { body: { email: email.trim().toLowerCase() } });
      setStep("code");
    } catch (err) {
      setError(errorText(err, t("common.somethingWrong")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      {step === "done" ? (
        <div className="py-2 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-paid" />
          <h1 className="font-display text-lg font-semibold">{t("ux.passwordSet")}</h1>
          <p className="mb-4 mt-1 text-sm text-ink-muted">{t("ux.passwordSetBody")}</p>
          <Link to={loginPath}>
            <Button className="w-full">{t("auth.login")}</Button>
          </Link>
        </div>
      ) : step === "email" ? (
        <>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="font-display text-lg font-semibold">{t("auth.resetPassword")}</h1>
          <p className="mb-4 mt-0.5 text-sm text-ink-muted">{t("ux.resetIntro")}</p>
          <form onSubmit={sendCode} className="space-y-3">
            <Field label={t("auth.email")} htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-overdue">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              {t("ux.sendCode")}
            </Button>
          </form>
          <button type="button" className="mt-3 w-full text-center text-sm text-brand-600 hover:underline" onClick={() => setStep("code")}>
            {t("ux.alreadyHaveCode")}
          </button>
        </>
      ) : (
        <>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MailCheck className="h-5 w-5" />
          </div>
          <h1 className="font-display text-lg font-semibold">
            {mode === "invite" ? t("ux.setupAccount") : t("ux.enterCode")}
          </h1>
          <p className="mb-4 mt-0.5 text-sm text-ink-muted">
            {email ? t("ux.codeSentTo", { email }) : mode === "invite" ? t("ux.inviteIntro") : t("ux.enterCodeIntro")}
          </p>
          <SetPasswordForm
            reference={preRef}
            code={preCode}
            submitLabel={mode === "invite" ? t("ux.setPassword") : t("auth.resetPassword")}
            onDone={() => setStep("done")}
          />
          {mode === "invite" && (
            <Link to="/forgot-password" className="mt-3 block text-center text-sm text-brand-600 hover:underline">
              {t("ux.lostInvite")}
            </Link>
          )}
        </>
      )}
      <Link to={loginPath} className="mt-4 block text-center text-sm text-ink-muted hover:text-ink">
        ← {t("ux.backToLogin")}
      </Link>
    </AuthFrame>
  );
}

/** "Change password" card for a signed-in user (owner, caretaker, tenant). */
export function ChangePasswordCard() {
  const { t } = useTranslation();
  const { api, user } = useAuth();
  const [stage, setStage] = useState<"idle" | "code" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!user?.email) return;
    setError(null);
    setLoading(true);
    try {
      await req(api, "POST", "/api/v1/auth/password/reset", { body: { email: user.email } });
      setStage("code");
    } catch (err) {
      setError(errorText(err, t("common.somethingWrong")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ux.changePassword")}</CardTitle>
      </CardHeader>
      <CardBody>
        {stage === "done" ? (
          <p className="flex items-center gap-2 text-sm text-paid-fg">
            <CheckCircle2 className="h-4 w-4" /> {t("ux.passwordChanged")}
          </p>
        ) : stage === "idle" ? (
          <>
            <p className="mb-3 text-sm text-ink-muted">{t("ux.changePasswordIntro", { email: user?.email ?? "" })}</p>
            {error && <p className="mb-2 text-sm text-overdue">{error}</p>}
            <Button variant="outline" loading={loading} onClick={sendCode}>
              <KeyRound className="h-4 w-4" /> {t("ux.sendCode")}
            </Button>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-muted">{t("ux.codeSentTo", { email: user?.email ?? "" })}</p>
            <SetPasswordForm
              reference={user?.public_id}
              hideReference
              submitLabel={t("ux.changePassword")}
              onDone={() => setStage("done")}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}
