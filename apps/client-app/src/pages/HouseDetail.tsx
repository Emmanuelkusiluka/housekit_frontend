import { req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Menu,
  MenuItem,
  Modal,
  Money,
  PageHeader,
  Skeleton,
  StatusPill,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MoreVertical, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { House, Occupancy, Unit } from "../types";

export function HouseDetail() {
  const { houseId } = useParams();
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isOwner = user?.role === "client_admin";
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [rent, setRent] = useState("");

  const house = useQuery({
    queryKey: ["house", houseId],
    queryFn: () => req<House>(api, "GET", `/api/v1/houses/${houseId}/`),
  });
  const units = useQuery({
    queryKey: ["house", houseId, "units"],
    queryFn: () => req<Unit[]>(api, "GET", `/api/v1/houses/${houseId}/units/`),
  });
  const occ = useQuery({
    queryKey: ["house", houseId, "occupancy"],
    queryFn: () => req<Occupancy>(api, "GET", `/api/v1/houses/${houseId}/occupancy/`),
  });

  const addUnit = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/units/", { body: { house_public_id: houseId, label, monthly_rent: rent } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["house", houseId] });
      void qc.invalidateQueries({ queryKey: ["occupancy"] });
      toast({ tone: "success", title: t("portfolio.addUnit") });
      setShowAdd(false);
      setLabel("");
      setRent("");
    },
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      req(api, "PATCH", `/api/v1/units/${v.id}/`, { body: { status: v.status } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["house", houseId] });
      void qc.invalidateQueries({ queryKey: ["occupancy"] });
    },
  });

  return (
    <div>
      <Link to="/portfolio" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> {t("portfolio.title")}
      </Link>
      <PageHeader
        title={house.data?.name ?? ""}
        description={
          occ.data
            ? `${occ.data.occupied}/${occ.data.total} ${t("status.occupied").toLowerCase()} · ${occ.data.occupancy_rate}%`
            : undefined
        }
        action={
          isOwner &&
          house.data?.house_type === "room_based" && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> {t("portfolio.addUnit")}
            </Button>
          )
        }
      />

      {units.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {units.data?.map((u) => (
            <Card key={u.public_id}>
              <CardBody className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{u.label}</p>
                  <Money value={u.monthly_rent} className="text-sm text-ink-muted" />
                  <div className="mt-2">
                    <StatusPill status={u.status} />
                  </div>
                </div>
                {isOwner && (
                  <Menu
                    trigger={
                      <button className="rounded-lg p-1 text-ink-muted hover:bg-canvas">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                  >
                    {(["occupied", "vacant", "maintenance"] as const).map((s) => (
                      <MenuItem key={s} onSelect={() => setStatus.mutate({ id: u.public_id, status: s })}>
                        {t(`status.${s}`)}
                      </MenuItem>
                    ))}
                  </Menu>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAdd}
        onOpenChange={setShowAdd}
        title={t("portfolio.addUnit")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              {t("common.cancel")}
            </Button>
            <Button loading={addUnit.isPending} disabled={!label || !rent} onClick={() => addUnit.mutate()}>
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("portfolio.label")}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="101" />
          </Field>
          <Field label={t("portfolio.monthlyRent")} hint="TZS">
            <Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
