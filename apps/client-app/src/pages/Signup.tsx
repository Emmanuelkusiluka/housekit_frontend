import { HousekitError } from "@housekit/api-client";
import { req, useApi, useAuth } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, Field, Input, LanguageSwitcher } from "@housekit/ui";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SignupResponse {
  access: string;
  refresh: string;
  user: { public_id: string; email: string; full_name: string; role: string };
}

export function Signup() {
  const { t } = useTranslation();
  const api = useApi();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: "", full_name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await req<SignupResponse>(api, "POST", "/api/v1/auth/signup", { body: form });
      setSession({ access: res.access, refresh: res.refresh }, res.user);
      navigate("/setup", { replace: true });
    } catch (err) {
      setError(
        err instanceof HousekitError ? err.message : t("common.somethingWrong"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="mb-6 text-center">
        <p className="font-display text-2xl font-bold text-brand-700">Housekit</p>
        <p className="mt-1 text-sm text-ink-muted">{t("common.tagline")}</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="font-display text-lg font-semibold">{t("auth.signupTitle")}</h1>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Field label={t("auth.businessName")} htmlFor="bn">
              <Input id="bn" required value={form.business_name} onChange={set("business_name")} />
            </Field>
            <Field label={t("auth.fullName")} htmlFor="fn">
              <Input id="fn" required value={form.full_name} onChange={set("full_name")} />
            </Field>
            <Field label={t("auth.email")} htmlFor="em">
              <Input id="em" type="email" required value={form.email} onChange={set("email")} />
            </Field>
            <Field label={t("auth.password")} htmlFor="pw" hint="Min. 8 characters">
              <Input
                id="pw"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={set("password")}
              />
            </Field>
            {error && <p className="text-sm text-overdue">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              {t("auth.signup")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-ink-muted">
            {t("auth.login")}?{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              {t("auth.login")}
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
