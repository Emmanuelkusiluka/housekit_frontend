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
import { Building2, Home, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import type { Compound, House, Occupancy } from "../types";

export function Portfolio() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const isOwner = user?.role === "client_admin";
  const [showHouse, setShowHouse] = useState(false);
  const [showCompounds, setShowCompounds] = useState(false);

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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCompounds(true)}>
                <Building2 className="h-4 w-4" /> {t("portfolio.compound")}
              </Button>
              <Button onClick={() => setShowHouse(true)}>
                <Plus className="h-4 w-4" /> {t("portfolio.addHouse")}
              </Button>
            </div>
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
      <ManageCompoundsModal open={showCompounds} onClose={() => setShowCompounds(false)} />
    </div>
  );
}

function ManageCompoundsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const compounds = useQuery({
    queryKey: ["compounds"],
    enabled: open,
    queryFn: () => req<Paginated<Compound>>(api, "GET", "/api/v1/compounds/"),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["compounds"] });
    void qc.invalidateQueries({ queryKey: ["houses"] });
  };

  const create = useMutation({
    mutationFn: () => req(api, "POST", "/api/v1/compounds/", { body: { name, address } }),
    onSuccess: () => {
      invalidate();
      setName("");
      setAddress("");
      toast({ tone: "success", title: t("portfolio.addCompound") });
    },
    onError: () => toast({ tone: "error", title: t("common.somethingWrong") }),
  });

  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) =>
      req(api, "PATCH", `/api/v1/compounds/${v.id}/`, { body: { name: v.name } }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: () => toast({ tone: "error", title: t("common.somethingWrong") }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => req(api, "DELETE", `/api/v1/compounds/${id}/`),
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: t("common.delete") });
    },
    // Backend blocks deleting a compound that still has houses — surface the reason.
    onError: (e: unknown) =>
      toast({
        tone: "error",
        title: (e as { message?: string })?.message ?? t("common.somethingWrong"),
      }),
  });

  const list = compounds.data?.results ?? [];

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("portfolio.compound")}
      description="Group houses into compounds. Delete is blocked while a compound still has houses."
      footer={
        <Button variant="ghost" onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Add */}
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t("portfolio.addCompound")} className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("portfolio.compound")} />
          </Field>
          <Field label={`${t("common.optional")}`} className="flex-1">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
          </Field>
          <Button loading={create.isPending} disabled={!name.trim()} onClick={() => create.mutate()}>
            <Plus className="h-4 w-4" /> {t("common.add")}
          </Button>
        </div>

        {/* List */}
        <div className="divide-y divide-line border-t border-line">
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">{t("common.noResults")}</p>
          ) : (
            list.map((c) => (
              <div key={c.public_id} className="flex items-center gap-2 py-2.5">
                {editing?.id === c.public_id ? (
                  <>
                    <Input
                      className="flex-1"
                      value={editing.name}
                      onChange={(e) => setEditing({ id: c.public_id, name: e.target.value })}
                    />
                    <Button
                      size="sm"
                      loading={rename.isPending}
                      disabled={!editing.name.trim()}
                      onClick={() => rename.mutate(editing)}
                    >
                      {t("common.save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      {t("common.cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {c.house_count} {t("portfolio.title").toLowerCase()}
                        {c.address ? ` · ${c.address}` : ""}
                      </p>
                    </div>
                    <button
                      className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
                      title={t("common.edit")}
                      onClick={() => setEditing({ id: c.public_id, name: c.name })}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-ink-muted hover:bg-overdue-bg hover:text-overdue-fg disabled:opacity-40"
                      title={t("common.delete")}
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`${t("common.delete")} "${c.name}"?`)) remove.mutate(c.public_id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
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
