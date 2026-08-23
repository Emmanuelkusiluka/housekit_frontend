import { useTranslation } from "@housekit/i18n";
import { Button, LanguageSwitcher } from "@housekit/ui";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { CLIENT_URL } from "../config";

export function MarketingLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-display text-xl font-bold text-brand-700">
            Housekit
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
            <Link to="/#features" className="hover:text-ink">
              {t("marketing.features")}
            </Link>
            <Link to="/pricing" className="hover:text-ink">
              {t("marketing.pricing")}
            </Link>
            <Link to="/apply" className="hover:text-ink">
              {t("onboarding.talkToUs")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <a href={`${CLIENT_URL}/login`}>
              <Button variant="ghost" size="sm">
                {t("marketing.signIn")}
              </Button>
            </a>
            <a href={`${CLIENT_URL}/signup`}>
              <Button size="sm">{t("marketing.getStarted")}</Button>
            </a>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-ink-muted md:flex-row">
          <span>© {new Date().getFullYear()} Housekit · Dar es Salaam</span>
          <div className="flex gap-4">
            <Link to="/pricing">{t("marketing.pricing")}</Link>
            <Link to="/apply">{t("onboarding.talkToUs")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
