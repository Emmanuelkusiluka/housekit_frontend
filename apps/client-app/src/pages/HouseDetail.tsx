import { fetchAll, matchesSearch, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuItem,
  Modal,
  Money,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  StatusPill,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, DoorOpen, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { House, Occupancy, Tenancy, Unit } from "../types";

export function HouseDetail() {
  const { houseId } = useParams();
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isOwner = user?.role === "client_admin";
  // Owners and caretakers may both edit a house/room's details; only owners
  // can add or remove one (matches the backend's CaretakerCanEdit policy).
  const canEdit = isOwner || user?.role === "caretaker";
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [rent, setRent] = useState("");
  const [showEditHouse, setShowEditHouse] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [deleteHouse, setDeleteHouse] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

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

  // Who lives where — so each room card shows its tenant, not just "occupied".
  const tenancies = useQuery({
    queryKey: ["tenancies", "active"],
    queryFn: () => fetchAll<Tenancy>(api, "/api/v1/tenancies/", { status: "active" }),
  });
  const allUnits = units.data ?? [];
  const tenantByUnit = new Map<string, Tenancy>();
  tenancies.data?.forEach((tn) => tenantByUnit.set(tn.unit, tn));

  const removeUnit = useMutation({
    mutationFn: (id: string) => req(api, "DELETE", `/api/v1/units/${id}/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["house", houseId] });
      void qc.invalidateQueries({ queryKey: ["houses"] });
      void qc.invalidateQueries({ queryKey: ["occupancy"] });
      setDeleteUnit(null);
      toast({ tone: "success", title: t("ux.deleted") });
    },
  });
  const removeHouse = useMutation({
    // A property added by mistake: clear its (empty) rooms, then the house.
    // The backend refuses any room with tenant/rent history and says why, so
    // real records can never be lost this way.
    mutationFn: async () => {
      for (const u of allUnits) await req(api, "DELETE", `/api/v1/units/${u.public_id}/`);
      await req(api, "DELETE", `/api/v1/houses/${houseId}/`);
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ["house", houseId] });
      setDeleteHouse(false);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["houses"] });
      void qc.invalidateQueries({ queryKey: ["occupancy"] });
      toast({ tone: "success", title: t("ux.deleted") });
      navigate("/portfolio");
    },
  });

  const shownUnits = allUnits.filter((u) => {
    const tn = tenantByUnit.get(u.public_id);
    return matchesSearch(search, [u.label, tn?.resident_name, t(`status.${u.status}`)]);
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
          <div className="flex gap-2">
            {canEdit && house.data && (
              <Button variant="outline" onClick={() => setShowEditHouse(true)}>
                <Pencil className="h-4 w-4" /> {t("portfolio.editHouse")}
              </Button>
            )}
            {isOwner && house.data?.house_type === "room_based" && (
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" /> {t("portfolio.addUnit")}
              </Button>
            )}
            {isOwner && house.data && (
              <Button
                variant="ghost"
                className="text-overdue-fg hover:bg-overdue-bg"
                aria-label={t("ux.deleteHouse")}
                title={t("ux.deleteHouse")}
                onClick={() => setDeleteHouse(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {units.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : allUnits.length === 0 ? (
        <EmptyState
          icon={<DoorOpen />}
          title={t("portfolio.noUnits")}
          description={isOwner ? t("ux.noUnitsBody") : undefined}
          action={
            isOwner &&
            house.data?.house_type === "room_based" && (
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" /> {t("portfolio.addUnit")}
              </Button>
            )
          }
        />
      ) : (
        <>
          {allUnits.length > 6 && (
            <SearchInput
              className="mb-4 max-w-md"
              value={search}
              onChange={setSearch}
              placeholder={t("ux.searchRooms")}
            />
          )}
          {shownUnits.length === 0 && (
            <EmptyState
              compact
              icon={<DoorOpen />}
              title={t("ux.noMatchTitle", { query: search })}
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  {t("ux.clearSearch")}
                </Button>
              }
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shownUnits.map((u) => {
              const tn = tenantByUnit.get(u.public_id);
              return (
                <Card key={u.public_id}>
                  <CardBody className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{u.label}</p>
                      <Money value={u.monthly_rent} className="text-sm text-ink-muted" />
                      <div className="mt-2">
                        <StatusPill status={u.status} />
                      </div>
                      {tn && (
                        <Link
                          to="/tenants"
                          className="mt-3 flex items-center gap-2 text-sm text-ink hover:text-brand-700"
                        >
                          <Avatar name={tn.resident_name} size="sm" />
                          <span className="truncate">{tn.resident_name}</span>
                        </Link>
                      )}
                    </div>
                    {canEdit && (
                      <Menu
                        trigger={
                          <button className="rounded-lg p-1 text-ink-muted hover:bg-canvas" aria-label={t("common.actions")}>
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        }
                      >
                        <MenuItem onSelect={() => setEditUnit(u)}>{t("portfolio.editUnit")}</MenuItem>
                        {(["occupied", "vacant", "maintenance"] as const).map((st) => (
                          <MenuItem key={st} onSelect={() => setStatus.mutate({ id: u.public_id, status: st })}>
                            {t(`status.${st}`)}
                          </MenuItem>
                        ))}
                        {isOwner && (
                          <MenuItem danger onSelect={() => setDeleteUnit(u)}>
                            {t("ux.deleteRoom")}
                          </MenuItem>
                        )}
                      </Menu>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteUnit}
        onOpenChange={(o) => !o && setDeleteUnit(null)}
        title={t("ux.deleteNamed", { name: deleteUnit?.label ?? "" })}
        description={
          deleteUnit && tenantByUnit.has(deleteUnit.public_id) ? t("ux.roomHasTenant") : t("ux.deleteRoomBody")
        }
        confirmLabel={t("ux.deleteRoom")}
        loading={removeUnit.isPending}
        onConfirm={() => deleteUnit && removeUnit.mutate(deleteUnit.public_id)}
      />
      <ConfirmDialog
        open={deleteHouse}
        onOpenChange={setDeleteHouse}
        title={t("ux.deleteNamed", { name: house.data?.name ?? "" })}
        description={allUnits.length > 0 ? t("ux.houseHasRooms", { count: allUnits.length }) : t("ux.deleteHouseBody")}
        confirmLabel={t("ux.deleteHouse")}
        loading={removeHouse.isPending}
        onConfirm={() => removeHouse.mutate()}
      />

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

      {house.data && (
        <EditHouseModal
          house={house.data}
          open={showEditHouse}
          onClose={() => setShowEditHouse(false)}
        />
      )}
      {editUnit && (
        <EditUnitModal unit={editUnit} open={Boolean(editUnit)} onClose={() => setEditUnit(null)} />
      )}
    </div>
  );
}

function EditHouseModal({ house, open, onClose }: { house: House; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(house.name);
  const [address, setAddress] = useState(house.address);

  // Re-sync when a different house's edit is opened.
  useEffect(() => {
    if (open) {
      setName(house.name);
      setAddress(house.address);
    }
  }, [open, house]);

  const save = useMutation({
    mutationFn: () => req(api, "PATCH", `/api/v1/houses/${house.public_id}/`, { body: { name, address } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["house", house.public_id] });
      void qc.invalidateQueries({ queryKey: ["houses"] });
      toast({ tone: "success", title: t("portfolio.editHouse") });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("portfolio.editHouse")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={save.isPending} disabled={!name.trim()} onClick={() => save.mutate()}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("portfolio.house")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("portfolio.address")}>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function EditUnitModal({ unit, open, onClose }: { unit: Unit; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [label, setLabel] = useState(unit.label);
  const [rent, setRent] = useState(unit.monthly_rent);
  const [status, setStatusField] = useState(unit.status);

  useEffect(() => {
    if (open) {
      setLabel(unit.label);
      setRent(unit.monthly_rent);
      setStatusField(unit.status);
    }
  }, [open, unit]);

  const save = useMutation({
    mutationFn: () =>
      req(api, "PATCH", `/api/v1/units/${unit.public_id}/`, {
        body: { label, monthly_rent: rent, status },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["house", unit.house] });
      void qc.invalidateQueries({ queryKey: ["occupancy"] });
      toast({ tone: "success", title: t("portfolio.editUnit") });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("portfolio.editUnit")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={save.isPending} disabled={!label.trim() || !rent} onClick={() => save.mutate()}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("portfolio.label")}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label={t("portfolio.monthlyRent")} hint="TZS">
          <Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} />
        </Field>
        <Field label={t("common.status")}>
          <Select value={status} onChange={(e) => setStatusField(e.target.value as Unit["status"])}>
            {(["occupied", "vacant", "maintenance"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
