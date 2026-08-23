import { Paginated, req, useApi } from "@housekit/app-kit";
import { formatDate } from "@housekit/ui";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, EmptyState, Money, PageHeader } from "@housekit/ui";
import { useQuery } from "@tanstack/react-query";
import { Receipt as ReceiptIcon } from "lucide-react";

import { API_URL } from "../config";
import type { Receipt } from "../types";

export function Receipts() {
  const { t } = useTranslation();
  const api = useApi();
  const receipts = useQuery({
    queryKey: ["my-receipts"],
    queryFn: () => req<Paginated<Receipt>>(api, "GET", "/api/v1/portal/receipts/"),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("nav.receipts")} />
      {receipts.data && receipts.data.results.length > 0 ? (
        <div className="space-y-2">
          {receipts.data.results.map((r) => (
            <Card key={r.public_id}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{r.number}</p>
                  <p className="text-sm text-ink-muted">{formatDate(r.issued_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Money value={r.amount} emphasis />
                  {r.document_url && (
                    <a
                      href={r.document_url.startsWith("http") ? r.document_url : `${API_URL}${r.document_url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="outline">
                        {t("leases.downloadPdf")}
                      </Button>
                    </a>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ReceiptIcon className="h-10 w-10" />} title={t("common.noResults")} />
      )}
    </div>
  );
}
