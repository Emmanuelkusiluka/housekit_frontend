import { useTranslation } from "@housekit/i18n";
import { Badge, Button, Card, CardBody, Money, Skeleton } from "@housekit/ui";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";

import { apiGet, CLIENT_URL } from "../config";
import { MarketingLayout } from "../layout/MarketingLayout";

interface Package {
  public_id: string;
  name: string;
  unit_min: number;
  unit_max: number | null;
  price_monthly: string;
  price_annual: string;
}

export function Pricing() {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);
  const packages = useQuery({ queryKey: ["packages"], queryFn: () => apiGet<Package[]>("/api/v1/packages/") });

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">{t("marketing.pricing")}</h1>
          <p className="mt-2 text-ink-muted">{t("subscription.title")}</p>
          <div className="mt-6 inline-flex items-center gap-1 rounded-full bg-canvas p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${!annual ? "bg-surface shadow-card" : "text-ink-muted"}`}
            >
              {t("marketing.monthly")}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${annual ? "bg-surface shadow-card" : "text-ink-muted"}`}
            >
              {t("marketing.annual")}
            </button>
          </div>
        </div>

        {packages.isLoading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.data?.map((p, i) => (
              <Card key={p.public_id} className={i === 2 ? "ring-2 ring-brand-500" : ""}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-semibold">{p.name}</p>
                    {i === 2 && <Badge tone="brand">{t("onboarding.recommended")}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {p.unit_min}–{p.unit_max ?? "∞"} {t("portfolio.units").toLowerCase()}
                  </p>
                  <p className="mt-4 font-display text-3xl font-bold">
                    <Money value={annual ? p.price_annual : p.price_monthly} />
                    <span className="text-sm font-normal text-ink-muted">
                      {annual ? t("subscription.perYear") : t("subscription.perMonth")}
                    </span>
                  </p>
                  <ul className="mt-4 space-y-1 text-sm text-ink-muted">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-paid" /> {t("nav.payments")}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-paid" /> {t("nav.reports")}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-paid" /> {t("nav.tenants")}
                    </li>
                  </ul>
                  <a href={`${CLIENT_URL}/signup`} className="mt-5 block">
                    <Button className="w-full">{t("marketing.getStarted")}</Button>
                  </a>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}
