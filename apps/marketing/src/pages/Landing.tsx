import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody } from "@housekit/ui";
import { BarChart3, Bell, Building2, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import { CLIENT_URL } from "../config";
import { MarketingLayout } from "../layout/MarketingLayout";

export function Landing() {
  const { t } = useTranslation();
  const features = [
    { icon: Building2, title: t("nav.portfolio"), body: t("portfolio.title") },
    { icon: Wallet, title: t("payments.title"), body: t("payments.ledger") },
    { icon: Bell, title: t("nav.notifications"), body: t("status.overdue") },
    { icon: BarChart3, title: t("reports.title"), body: t("reports.netProfit") },
    { icon: ShieldCheck, title: t("common.tagline"), body: t("tenants.nationalId") },
    { icon: Smartphone, title: t("marketing.mobileFirst"), body: t("marketing.heroSubtitle") },
  ];

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center md:pt-24">
        <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Dar es Salaam · TZS · Kiswahili
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
          {t("marketing.heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted">{t("marketing.heroSubtitle")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={`${CLIENT_URL}/signup`}>
            <Button size="lg">{t("marketing.getStarted")}</Button>
          </a>
          <Link to="/pricing">
            <Button size="lg" variant="outline">
              {t("marketing.pricing")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-line bg-canvas py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center font-display text-2xl font-semibold">{t("marketing.features")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardBody>
                  <f.icon className="mb-3 h-6 w-6 text-brand-600" />
                  <p className="font-medium text-ink">{f.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{f.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Free tools teaser */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="font-display text-2xl font-semibold">{t("marketing.freeTools")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-muted">{t("marketing.freeToolsList")}</p>
          <div className="mt-6">
            <Button variant="secondary" disabled>
              {t("common.next")} (03)
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold">{t("marketing.heroTitle")}</h2>
          <div className="mt-6 flex justify-center gap-3">
            <a href={`${CLIENT_URL}/signup`}>
              <Button size="lg" variant="secondary">
                {t("marketing.getStarted")}
              </Button>
            </a>
            <Link to="/apply">
              <Button size="lg" className="bg-white/10 text-white hover:bg-white/20">
                {t("onboarding.talkToUs")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
