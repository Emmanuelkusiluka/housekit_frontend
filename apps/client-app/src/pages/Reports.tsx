import { req, useApi } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, CardHeader, CardTitle, Money, PageHeader, Select, Skeleton, StatTile } from "@housekit/ui";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";

import { API_URL } from "../config";

interface YearSummary {
  year: number;
  income: string;
  expenses: string;
  net_profit: string;
  previous_year: { year: number; income: string; expenses: string; net_profit: string };
  income_by_month: { month: string; total: string }[];
  expenses_by_category: { category: string; total: string }[];
}

function accessToken(): string | null {
  try {
    const raw = localStorage.getItem("housekit.client.tokens");
    return raw ? (JSON.parse(raw) as { access: string }).access : null;
  } catch {
    return null;
  }
}

async function downloadReport(type: string, year: number, format: "csv" | "pdf") {
  const res = await fetch(`${API_URL}/api/v1/reports/export?type=${type}&year=${year}&format=${format}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-${year}.${format === "pdf" ? "pdf" : "csv"}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const { t } = useTranslation();
  const api = useApi();
  const now = new Date().getFullYear();
  const [year, setYear] = useState(now);

  const summary = useQuery({
    queryKey: ["reports", "summary", year],
    queryFn: () => req<YearSummary>(api, "GET", "/api/v1/reports/summary", { params: { query: { year } } }),
  });

  const maxMonth = Math.max(1, ...(summary.data?.income_by_month.map((m) => Number(m.total)) ?? [1]));

  return (
    <div>
      <PageHeader
        title={t("reports.title")}
        action={
          <div className="flex items-center gap-2">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
              {[now, now - 1, now - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={() => downloadReport("profit", year, "csv")}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        }
      />

      {summary.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        summary.data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label={t("reports.income")} value={<Money value={summary.data.income} />} tone="paid" />
              <StatTile label={t("reports.expenses")} value={<Money value={summary.data.expenses} />} tone="overdue" />
              <StatTile label={t("reports.netProfit")} value={<Money value={summary.data.net_profit} />} tone="brand" />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("reports.byMonth")}</CardTitle>
                </CardHeader>
                <CardBody className="space-y-2">
                  {summary.data.income_by_month.length === 0 && (
                    <p className="text-sm text-ink-muted">{t("common.noResults")}</p>
                  )}
                  {summary.data.income_by_month.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs text-ink-muted">{m.month.slice(0, 7)}</span>
                      <div className="h-2 flex-1 rounded-full bg-canvas">
                        <div
                          className="h-2 rounded-full bg-brand-500"
                          style={{ width: `${(Number(m.total) / maxMonth) * 100}%` }}
                        />
                      </div>
                      <Money value={m.total} className="w-24 text-right text-xs" />
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("reports.byCategory")}</CardTitle>
                </CardHeader>
                <CardBody className="space-y-2">
                  {summary.data.expenses_by_category.length === 0 && (
                    <p className="text-sm text-ink-muted">{t("common.noResults")}</p>
                  )}
                  {summary.data.expenses_by_category.map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <span>{t(`expenses.${c.category}`, { defaultValue: c.category })}</span>
                      <Money value={c.total} emphasis />
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>

            <Card className="mt-4">
              <CardBody className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-ink-muted">
                  {t("reports.yearOnYear")} ({summary.data.previous_year.year})
                </span>
                <span>
                  {t("reports.netProfit")}:{" "}
                  <Money value={summary.data.previous_year.net_profit} emphasis />
                </span>
              </CardBody>
            </Card>
          </>
        )
      )}
    </div>
  );
}
