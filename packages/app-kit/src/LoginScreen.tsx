import { HousekitError } from "@housekit/api-client";
import { useAuth } from "@housekit/auth";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, Field, Input, LanguageSwitcher } from "@housekit/ui";
import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function LoginScreen({
  title,
  subtitle,
  footer,
  accent = "Housekit",
}: {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  accent?: string;
}) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof HousekitError ? t("auth.invalidCredentials") : t("common.somethingWrong"));
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
        <p className="font-display text-2xl font-bold text-brand-700">{accent}</p>
        <p className="mt-1 text-sm text-ink-muted">{t("common.tagline")}</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="font-display text-lg font-semibold">{title ?? t("auth.loginTitle")}</h1>
          <p className="mb-4 mt-0.5 text-sm text-ink-muted">{subtitle ?? t("auth.loginSubtitle")}</p>
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label={t("auth.email")} htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("auth.password")} htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <p className="text-sm text-overdue">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              {t("auth.login")}
            </Button>
          </form>
          {footer && <div className="mt-4 text-center text-sm text-ink-muted">{footer}</div>}
        </CardBody>
      </Card>
    </div>
  );
}
