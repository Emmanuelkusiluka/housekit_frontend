import { Paginated, req, useApi } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, PageHeader, Stepper } from "@housekit/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

import type { House, Occupancy, StaffUser, Tenancy } from "../types";

export function Setup() {
  const { t } = useTranslation();
  const api = useApi();

  const houses = useQuery({ queryKey: ["houses"], queryFn: () => req<Paginated<House>>(api, "GET", "/api/v1/houses/") });
  const occ = useQuery({ queryKey: ["occupancy"], queryFn: () => req<Occupancy>(api, "GET", "/api/v1/occupancy/") });
  const staff = useQuery({ queryKey: ["users"], queryFn: () => req<Paginated<StaffUser>>(api, "GET", "/api/v1/users/") });
  const tenancies = useQuery({
    queryKey: ["tenancies", "active"],
    queryFn: () => req<Paginated<Tenancy>>(api, "GET", "/api/v1/tenancies/"),
  });

  const hasHouse = (houses.data?.count ?? 0) > 0;
  const hasUnit = (occ.data?.total ?? 0) > 0;
  const hasCaretaker = (staff.data?.results.filter((u) => u.role === "caretaker").length ?? 0) > 0;
  const hasTenant = (tenancies.data?.count ?? 0) > 0;

  const steps = [
    { key: "house", label: t("onboarding.step1"), done: hasHouse, to: "/portfolio" },
    { key: "unit", label: t("onboarding.step2"), done: hasUnit, to: "/portfolio" },
    { key: "caretaker", label: t("onboarding.step3"), done: hasCaretaker, to: "/caretakers" },
    { key: "tenant", label: t("onboarding.step4"), done: hasTenant, to: "/tenants" },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("onboarding.setupTitle")} description={t("onboarding.checklistTitle")} />
      <Card className="mb-5">
        <CardBody>
          <Stepper steps={steps.map((s) => s.label)} current={current === -1 ? steps.length : current} />
        </CardBody>
      </Card>

      <div className="space-y-3">
        {steps.map((s) => (
          <Card key={s.key}>
            <CardBody className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    s.done ? "bg-paid text-white" : "bg-canvas text-ink-subtle"
                  }`}
                >
                  {s.done ? <Check className="h-4 w-4" /> : ""}
                </span>
                <span className={s.done ? "text-ink-muted line-through" : "font-medium text-ink"}>{s.label}</span>
              </div>
              {!s.done && (
                <Link to={s.to}>
                  <Button size="sm" variant="outline">
                    {t("common.next")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-5 text-center">
        <Link to="/">
          <Button>{t("nav.dashboard")}</Button>
        </Link>
      </div>
    </div>
  );
}
