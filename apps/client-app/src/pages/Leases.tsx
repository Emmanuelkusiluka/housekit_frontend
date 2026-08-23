import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Column, DataTable, EmptyState, PageHeader, StatusPill } from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";

import { API_URL } from "../config";
import type { Lease } from "../types";

export function Leases() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const leases = useQuery({
    queryKey: ["leases"],
    queryFn: () => req<Paginated<Lease>>(api, "GET", "/api/v1/leases/"),
  });

  const generate = useMutation({
    mutationFn: (id: string) => req(api, "POST", `/api/v1/leases/${id}/generate/`, { body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leases"] });
      toast({ tone: "success", title: t("leases.generate") });
    },
  });

  const cols: Column<Lease>[] = [
    { key: "resident", header: t("tenants.residentName"), render: (l) => <span className="font-medium">{l.resident_name}</span> },
    { key: "unit", header: t("portfolio.unit"), render: (l) => l.unit_label },
    { key: "status", header: t("common.status"), render: (l) => <StatusPill status={l.status} /> },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex justify-end gap-2">
          {l.status === "draft" && (
            <Button size="sm" loading={generate.isPending} onClick={() => generate.mutate(l.public_id)}>
              {t("leases.generate")}
            </Button>
          )}
          {l.document_url && (
            <a
              href={l.document_url.startsWith("http") ? l.document_url : `${API_URL}${l.document_url}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="outline">
                {t("leases.downloadPdf")}
              </Button>
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("leases.title")} />
      <DataTable
        columns={cols}
        rows={leases.data?.results ?? []}
        keyOf={(l) => l.public_id}
        loading={leases.isLoading}
        empty={
          <EmptyState
            icon={<FileSignature className="h-10 w-10" />}
            title={t("common.noResults")}
            description={t("tenants.register")}
          />
        }
      />
    </div>
  );
}
