import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  Field,
  Input,
  Money,
  PageHeader,
  Select,
  Skeleton,
  StatusPill,
  Modal,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Home, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import type { Compound, House, Occupancy } from "../types";

export function Portfolio() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const isOwner = user?.role === "client_admin";
  const [showHouse, setShowHouse] = useState(false);

  const occ = useQuery({ queryKey: ["occupancy"], queryFn: () => req<Occupancy>(api, "GET", "/api/v1/occupancy/") });
  const houses = useQuery({
    queryKey: ["houses"],
    queryFn: () => req<Paginated<House>>(api, "GET", "/api/v1/houses/"),
  });

  return (
    <div>
      <PageHeader
        title={t("portfolio.title")}
        description={t("nav.portfolio")}
        action={
          isOwner && (
            <Button onClick={() => setShowHouse(true)}>
              <Plus className="h-4 w-4" /> {t("portfolio.addHouse")}
            </Button>
          )
        }
      />

      {occ.data && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Card>
            <CardBody className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">{t("portfolio.occupancyRate")}</span>
              <span className="font-display text-xl font-semibold text-brand-600">
                {occ.data.occupancy_rate}%
              </span>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">{t("status.occupied")}</span>
              <span className="font-medium">
                {occ.data.occupied}/{occ.data.total}
              </span>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">{t("status.maintenance")}</span>
              <span className="font-medium">{occ.data.maintenance}</span>
            </CardBody>
          </Card>
        </div>
      )}

      {houses.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : houses.data && houses.data.results.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {houses.data.results.map((h) => (
            <Link key={h.public_id} to={`/portfolio/houses/${h.public_id}`}>
              <Card className="h-full transition-shadow hover:shadow-pop">
                <CardBody>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      {h.house_type === "standalone" ? (
                        <Home className="h-4 w-4 text-ink-muted" />
                      ) : (
                        <Building2 className="h-4 w-4 text-ink-muted" />
                      )}
                      {h.name}
                    </span>
                    <StatusPill
                      status="vacant"
                      label={t(h.house_type === "standalone" ? "portfolio.standalone" : "portfolio.roomBased")}
                    />
                  </div>
                  <p className="text-sm text-ink-muted">
                    {h.compound_name ?? "—"} · {h.unit_count} {t("portfolio.units").toLowerCase()}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title={t("portfolio.noHouses")}
          action={isOwner && <Button onClick={() => setShowHouse(true)}>{t("portfolio.addHouse")}</Button>}
        />
      )}

      <AddHouseModal open={showHouse} onClose={() => setShowHouse(false)} />
    </div>
  );
}

function AddHouseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", house_type: "room_based", monthly_rent: "", compound_public_id: "" });

  const compounds = useQuery({
    queryKey: ["compounds"],
    enabled: open,
    queryFn: () => req<Paginated<Compound>>(api, "GET", "/api/v1/compounds/"),
  });

  const create = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/houses/", {
        body: {
          name: form.name,
          house_type: form.house_type,
          compound_public_id: form.compound_public_id || undefined,
          monthly_rent: form.house_type === "standalone" ? form.monthly_rent : undefined,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["houses"] });
      void qc.invalidateQueries({ queryKey: ["occupancy"] });
      toast({ tone: "success", title: t("portfolio.addHouse") });
      onClose();
      setForm({ name: "", house_type: "room_based", monthly_rent: "", compound_public_id: "" });
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("portfolio.addHouse")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={create.isPending} disabled={!form.name} onClick={() => create.mutate()}>
            {t("common.create")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("portfolio.house")}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={t("portfolio.houseType")}>
          <Select value={form.house_type} onChange={(e) => setForm({ ...form, house_type: e.target.value })}>
            <option value="room_based">{t("portfolio.roomBased")}</option>
            <option value="standalone">{t("portfolio.standalone")}</option>
          </Select>
        </Field>
        {form.house_type === "standalone" && (
          <Field label={t("portfolio.monthlyRent")} hint="TZS">
            <Input
              type="number"
              value={form.monthly_rent}
              onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })}
            />
          </Field>
        )}
        <Field label={`${t("portfolio.compound")} (${t("common.optional")})`}>
          <Select
            value={form.compound_public_id}
            onChange={(e) => setForm({ ...form, compound_public_id: e.target.value })}
          >
            <option value="">{t("common.none")}</option>
            {compounds.data?.results.map((c) => (
              <option key={c.public_id} value={c.public_id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {form.house_type === "standalone" && (
          <p className="text-xs text-ink-muted">
            <Money value={form.monthly_rent || 0} /> — {t("portfolio.standalone")} auto-creates one unit.
          </p>
        )}
      </div>
    </Modal>
  );
}
