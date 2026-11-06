import { zodResolver } from "@hookform/resolvers/zod";
import {
  Paginated,
  downloadCsv,
  fetchAll,
  matchesSearch,
  req,
  roomBreadcrumb,
  useApi,
  useAuth,
  useToast,
} from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Column,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  Money,
  PageHeader,
  PersonCell,
  SearchInput,
  StatusPill,
  TabsBar,
  Textarea,
  formatDate,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveRestore,
  BadgeCheck,
  Download,
  LogOut,
  Pencil,
  Search,
  Send,
  Trash2,
  Undo2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Resident, Tenancy, Unit } from "../types";

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(5),
  national_id: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  unit_public_id: z.string().min(1),
  start_date: z.string().min(1),
  contract_months: z.coerce.number().int().min(1).max(120),
  deposit_amount: z.coerce.number().min(0).optional(),
  upfront_amount: z.coerce.number().min(0).optional(),
});
type FormValues = z.infer<typeof schema>;

// A resident has no active tenancy once they've moved out — they belong in
// the "Previous tenants" tab instead of cluttering the active roster.
// Residents removed by mistake are archived (never hard-deleted) and live in
// their own tab so they can be restored.
type TenantTab = "active" | "previous" | "archived";

const today = () => new Date().toISOString().slice(0, 10);

export function Tenants() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const isOwner = user?.role === "client_admin";
  const [showReg, setShowReg] = useState(false);
  const [tab, setTab] = useState<TenantTab>("active");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Every page, not just the first 100 — the old single request silently hid
  // tenants once an account grew past one page.
  const residents = useQuery({
    queryKey: ["residents", "current"],
    queryFn: () => fetchAll<Resident>(api, "/api/v1/residents/", { is_archived: false, ordering: "full_name" }),
  });
  const archived = useQuery({
    queryKey: ["residents", "archived"],
    queryFn: () => fetchAll<Resident>(api, "/api/v1/residents/", { is_archived: true, ordering: "full_name" }),
  });
  // All tenancies (not just active) — "previous tenants" needs the moved-out
  // ones too, to show where they used to live and when they left.
  const tenancies = useQuery({
    queryKey: ["tenancies", "all"],
    queryFn: () => fetchAll<Tenancy>(api, "/api/v1/tenancies/"),
  });

  const { activeByResident, lastMovedOutByResident } = useMemo(() => {
    const active = new Map<string, Tenancy>();
    const last = new Map<string, Tenancy>();
    tenancies.data?.forEach((tn) => {
      if (tn.status === "active") {
        active.set(tn.resident, tn);
      } else {
        const existing = last.get(tn.resident);
        if (!existing || (tn.move_out_date ?? "") > (existing.move_out_date ?? "")) last.set(tn.resident, tn);
      }
    });
    return { activeByResident: active, lastMovedOutByResident: last };
  }, [tenancies.data]);

  const allResidents = residents.data ?? [];
  const lists: Record<TenantTab, Resident[]> = {
    active: allResidents.filter((r) => activeByResident.has(r.public_id)),
    previous: allResidents.filter((r) => !activeByResident.has(r.public_id)),
    archived: archived.data ?? [],
  };

  const tenancyFor = (r: Resident) => activeByResident.get(r.public_id) ?? lastMovedOutByResident.get(r.public_id);
  const searchable = (r: Resident) => {
    const tn = tenancyFor(r);
    return [r.full_name, r.phone, r.email, r.national_id, tn?.unit_label, tn?.house_name, tn?.compound_name];
  };
  const rows = lists[tab].filter((r) => matchesSearch(search, searchable(r)));
  const loading = residents.isLoading || tenancies.isLoading || (tab === "archived" && archived.isLoading);
  const opened =
    allResidents.find((r) => r.public_id === openId) ?? archived.data?.find((r) => r.public_id === openId) ?? null;

  const exportCsv = () => {
    downloadCsv(
      `tenants-${tab}-${today()}.csv`,
      [t("tenants.residentName"), t("auth.phone"), t("auth.email"), t("portfolio.compound"), t("portfolio.house"), t("portfolio.unit"), t("tenants.startDate"), t("tenants.moveOutDate"), t("portfolio.monthlyRent"), t("common.status")],
      rows.map((r) => {
        const tn = tenancyFor(r);
        return [r.full_name, r.phone, r.email, tn?.compound_name, tn?.house_name, tn?.unit_label, tn?.start_date, tn?.move_out_date, tn?.monthly_rent, r.verification_status];
      }),
    );
  };

  const nameCol: Column<Resident> = {
    key: "name",
    header: t("tenants.residentName"),
    render: (r) => <PersonCell name={r.full_name} sub={r.phone || r.email} muted={tab !== "active"} />,
  };
  const unitCol = (pick: (r: Resident) => Tenancy | undefined): Column<Resident> => ({
    key: "unit",
    header: t("portfolio.unit"),
    render: (r) => {
      const tn = pick(r);
      if (!tn) return <span className="text-ink-subtle">—</span>;
      return (
        <span className={tab === "active" ? "" : "text-ink-muted"}>
          {roomBreadcrumb(tn.compound_name, tn.house_name, tn.unit_label)}
        </span>
      );
    },
  });

  const cols: Record<TenantTab, Column<Resident>[]> = {
    active: [
      nameCol,
      unitCol((r) => activeByResident.get(r.public_id)),
      { key: "verify", header: t("common.status"), render: (r) => <StatusPill status={r.verification_status} /> },
      {
        key: "portal",
        header: t("tenants.grantPortal"),
        hideOnMobile: true,
        render: (r) =>
          r.has_portal_access ? <Badge tone="success">✓</Badge> : <span className="text-ink-subtle">—</span>,
      },
    ],
    previous: [
      nameCol,
      unitCol((r) => lastMovedOutByResident.get(r.public_id)),
      {
        key: "movedOut",
        header: t("tenants.moveOutDate"),
        render: (r) => formatDate(lastMovedOutByResident.get(r.public_id)?.move_out_date),
      },
    ],
    archived: [nameCol, unitCol(tenancyFor), { key: "archived", header: t("common.status"), render: () => <Badge>{t("ux.archived")}</Badge> }],
  };

  const total = allResidents.length + (archived.data?.length ?? 0);
  const empty = search ? (
    <EmptyState
      ghosts={1}
      title={t("ux.noMatchTitle", { query: search })}
      description={t("ux.noMatchTenants")}
      action={
        <Button variant="outline" onClick={() => setSearch("")}>
          {t("ux.clearSearch")}
        </Button>
      }
    />
  ) : tab === "active" && total === 0 ? (
    <EmptyState
      ghosts={2}
      title={t("ux.tenantsEmptyTitle")}
      description={t("ux.tenantsEmptyBody")}
      action={
        <Button onClick={() => setShowReg(true)}>
          <UserPlus className="h-4 w-4" /> {t("tenants.register")}
        </Button>
      }
    />
  ) : (
    <EmptyState
      compact
      icon={<Users />}
      title={tab === "archived" ? t("ux.noArchived") : tab === "previous" ? t("ux.noPrevious") : t("tenants.noTenants")}
    />
  );

  return (
    <div>
      <PageHeader
        title={t("tenants.title")}
        description={
          lists.active.length > 0 ? (
            <span className="flex items-center gap-2">
              <AvatarStack names={lists.active.map((r) => r.full_name)} size="sm" max={4} />
              {t("ux.livingWithYou", { count: lists.active.length })}
            </span>
          ) : undefined
        }
        action={
          <Button onClick={() => setShowReg(true)}>
            <UserPlus className="h-4 w-4" /> {t("tenants.register")}
          </Button>
        }
      />
      <TabsBar
        className="mb-3"
        value={tab}
        onValueChange={(v) => setTab(v as TenantTab)}
        tabs={[
          { value: "active", label: `${t("tenants.title")} (${lists.active.length})` },
          { value: "previous", label: `${t("tenants.previousTenants")} (${lists.previous.length})` },
          { value: "archived", label: `${t("ux.archived")} (${lists.archived.length})` },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          className="min-w-[220px] flex-1"
          value={search}
          onChange={setSearch}
          placeholder={t("ux.searchTenants")}
        />
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> {t("ux.downloadCsv")}
        </Button>
      </div>
      {search && !loading && rows.length > 0 && (
        <p className="mb-2 text-xs text-ink-muted">{t("ux.resultsCount", { count: rows.length })}</p>
      )}
      <DataTable
        columns={cols[tab]}
        rows={rows}
        keyOf={(r) => r.public_id}
        loading={loading}
        onRowClick={(r) => setOpenId(r.public_id)}
        empty={empty}
      />
      <RegisterModal open={showReg} onClose={() => setShowReg(false)} />
      <TenantDrawer
        resident={opened}
        active={opened ? activeByResident.get(opened.public_id) : undefined}
        last={opened ? lastMovedOutByResident.get(opened.public_id) : undefined}
        isOwner={isOwner}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

/**
 * Everything about one tenant in one place, plus the actions owners kept
 * phoning about: fix a typo, remove someone added by mistake, undo a
 * mistaken move-out, restore an archived record.
 */
function TenantDrawer({
  resident,
  active,
  last,
  isOwner,
  onClose,
}: {
  resident: Resident | null;
  active?: Tenancy;
  last?: Tenancy;
  isOwner: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | "moveOut" | "remove" | "undo">(null);
  const [moveOutDate, setMoveOutDate] = useState(today());

  useEffect(() => {
    setEditing(false);
    setConfirm(null);
    setMoveOutDate(today());
  }, [resident?.public_id]);

  const refresh = () => {
    ["residents", "tenancies", "occupancy", "houses", "house", "units", "ledger"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  };

  const verify = useMutation({
    mutationFn: (id: string) => req(api, "POST", `/api/v1/residents/${id}/verify/`),
    onSuccess: () => {
      refresh();
      toast({ tone: "success", title: t("tenants.verified") });
    },
  });
  const grant = useMutation({
    mutationFn: (id: string) => req(api, "POST", `/api/v1/residents/${id}/grant_portal/`, { body: {} }),
    onSuccess: () => {
      refresh();
      toast({ tone: "success", title: t("ux.portalInviteSent") });
    },
  });
  const moveOut = useMutation({
    mutationFn: (v: { tenancyId: string; date: string }) =>
      req(api, "POST", `/api/v1/tenancies/${v.tenancyId}/move_out/`, { body: { move_out_date: v.date } }),
    onSuccess: () => {
      refresh();
      setConfirm(null);
      toast({ tone: "success", title: t("ux.movedOut") });
    },
  });
  const undo = useMutation({
    mutationFn: (tenancyId: string) => req(api, "POST", `/api/v1/tenancies/${tenancyId}/undo_move_out/`),
    onSuccess: () => {
      refresh();
      setConfirm(null);
      toast({ tone: "success", title: t("ux.moveOutUndone") });
    },
  });
  // "Added by mistake": free the room first (so it shows vacant again), then
  // archive the resident. The backend never hard-deletes — history is kept.
  const remove = useMutation({
    mutationFn: async (r: Resident) => {
      if (active) {
        await req(api, "POST", `/api/v1/tenancies/${active.public_id}/move_out/`, { body: { move_out_date: today() } });
      }
      await req(api, "DELETE", `/api/v1/residents/${r.public_id}/`);
    },
    onSuccess: () => {
      refresh();
      setConfirm(null);
      onClose();
      toast({ tone: "success", title: t("ux.tenantRemoved") });
    },
  });
  const restore = useMutation({
    mutationFn: (id: string) => req(api, "PATCH", `/api/v1/residents/${id}/`, { body: { is_archived: false } }),
    onSuccess: () => {
      refresh();
      toast({ tone: "success", title: t("ux.tenantRestored") });
    },
  });

  if (!resident) return <Drawer open={false} onOpenChange={() => onClose()} />;
  const tn = active ?? last;
  const where = tn ? roomBreadcrumb(tn.compound_name, tn.house_name, tn.unit_label) : "—";

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title={t("ux.tenantDetails")}>
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={resident.full_name} size="xl" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-ink">{resident.full_name}</p>
          <p className="truncate text-sm text-ink-muted">{where}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <StatusPill status={resident.verification_status} />
            {resident.is_archived && <Badge>{t("ux.archived")}</Badge>}
            {active && <StatusPill status="active" label={t("ux.livingHere")} />}
          </div>
        </div>
      </div>

      {editing ? (
        <EditResidentForm resident={resident} onDone={() => setEditing(false)} />
      ) : (
        <>
          <dl className="space-y-0 text-sm">
            {[
              [t("auth.phone"), resident.phone ? <a className="text-brand-600 hover:underline" href={`tel:${resident.phone}`}>{resident.phone}</a> : "—"],
              [t("auth.email"), resident.email || "—"],
              [t("tenants.nationalId"), resident.national_id || resident.national_id_masked || "—"],
              [t("tenants.emergencyContact"), [resident.emergency_contact_name, resident.emergency_contact_phone].filter(Boolean).join(" · ") || "—"],
              [t("tenants.startDate"), formatDate(tn?.start_date)],
              [t("ux.contractEnds"), formatDate(tn?.end_date)],
              [t("portfolio.monthlyRent"), tn ? <Money value={tn.monthly_rent} /> : "—"],
              [t("tenants.deposit"), tn ? <Money value={tn.deposit_amount} /> : "—"],
              ...(tn?.move_out_date ? [[t("tenants.moveOutDate"), formatDate(tn.move_out_date)]] : []),
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {resident.notes && <p className="mt-3 rounded-lg bg-canvas p-3 text-sm text-ink-muted">{resident.notes}</p>}

          <div className="mt-5 grid gap-2">
            {!resident.is_archived && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> {t("ux.editDetails")}
              </Button>
            )}
            {isOwner && !resident.is_archived && resident.verification_status !== "verified" && (
              <Button variant="outline" loading={verify.isPending} onClick={() => verify.mutate(resident.public_id)}>
                <BadgeCheck className="h-4 w-4" /> {t("tenants.verify")}
              </Button>
            )}
            {isOwner && !resident.is_archived && !resident.has_portal_access && (
              <Button variant="outline" loading={grant.isPending} onClick={() => grant.mutate(resident.public_id)}>
                <Send className="h-4 w-4" /> {t("tenants.grantPortal")}
              </Button>
            )}
            {active && (
              <Button variant="outline" onClick={() => setConfirm("moveOut")}>
                <LogOut className="h-4 w-4" /> {t("tenants.moveOut")}
              </Button>
            )}
            {isOwner && !active && last && !resident.is_archived && (
              <Button variant="outline" onClick={() => setConfirm("undo")}>
                <Undo2 className="h-4 w-4" /> {t("ux.undoMoveOut")}
              </Button>
            )}
            {resident.is_archived ? (
              <Button variant="outline" loading={restore.isPending} onClick={() => restore.mutate(resident.public_id)}>
                <ArchiveRestore className="h-4 w-4" /> {t("ux.restoreTenant")}
              </Button>
            ) : (
              <Button variant="ghost" className="text-overdue-fg hover:bg-overdue-bg" onClick={() => setConfirm("remove")}>
                <Trash2 className="h-4 w-4" /> {t("ux.removeTenant")}
              </Button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirm === "moveOut"}
        onOpenChange={(o) => !o && setConfirm(null)}
        media={<Avatar name={resident.full_name} size="lg" />}
        title={t("ux.moveOutTitle", { name: resident.full_name })}
        description={t("ux.moveOutBody", { where })}
        confirmLabel={t("tenants.moveOut")}
        loading={moveOut.isPending}
        onConfirm={() => active && moveOut.mutate({ tenancyId: active.public_id, date: moveOutDate })}
      >
        <Field label={t("tenants.moveOutDate")}>
          <Input type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "undo"}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone="primary"
        media={<Avatar name={resident.full_name} size="lg" />}
        title={t("ux.undoMoveOutTitle", { name: resident.full_name })}
        description={t("ux.undoMoveOutBody", { where })}
        confirmLabel={t("ux.undoMoveOut")}
        loading={undo.isPending}
        onConfirm={() => last && undo.mutate(last.public_id)}
      />
      <ConfirmDialog
        open={confirm === "remove"}
        onOpenChange={(o) => !o && setConfirm(null)}
        media={<Avatar name={resident.full_name} size="lg" />}
        title={t("ux.removeTenantTitle", { name: resident.full_name })}
        description={active ? t("ux.removeTenantBodyActive", { where }) : t("ux.removeTenantBody")}
        confirmLabel={t("ux.removeTenant")}
        loading={remove.isPending}
        onConfirm={() => remove.mutate(resident)}
      />
    </Drawer>
  );
}

function EditResidentForm({ resident, onDone }: { resident: Resident; onDone: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: resident.full_name,
    phone: resident.phone,
    email: resident.email,
    national_id: resident.national_id ?? "",
    emergency_contact_name: resident.emergency_contact_name,
    emergency_contact_phone: resident.emergency_contact_phone,
    notes: resident.notes,
  });
  // Caretakers only ever receive the masked NIDA — never send it back or we'd
  // overwrite the real number with asterisks.
  const nidaEditable = !resident.national_id?.includes("*");

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = { ...form };
      if (!nidaEditable) delete body.national_id;
      return req(api, "PATCH", `/api/v1/residents/${resident.public_id}/`, { body });
    },
    onSuccess: () => {
      ["residents", "tenancies", "ledger"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast({ tone: "success", title: t("ux.saved") });
      onDone();
    },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-3">
      <Field label={t("tenants.residentName")}>
        <Input value={form.full_name} onChange={set("full_name")} />
      </Field>
      <Field label={t("auth.phone")}>
        <Input type="tel" value={form.phone} onChange={set("phone")} />
      </Field>
      <Field label={t("auth.email")}>
        <Input type="email" value={form.email} onChange={set("email")} />
      </Field>
      {nidaEditable && (
        <Field label={t("tenants.nationalId")}>
          <Input value={form.national_id} onChange={set("national_id")} />
        </Field>
      )}
      <Field label={t("tenants.emergencyContact")}>
        <Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
      </Field>
      <Field label={`${t("tenants.emergencyContact")} — ${t("auth.phone")}`}>
        <Input type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
      </Field>
      <Field label={t("ux.notes")}>
        <Textarea value={form.notes} onChange={set("notes")} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button loading={save.isPending} disabled={form.full_name.trim().length < 2} onClick={() => save.mutate()}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function RegisterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { contract_months: 12 } });

  const submit = useMutation({
    mutationFn: async (v: FormValues) => {
      const resident = await req<Resident>(api, "POST", "/api/v1/residents/", {
        body: {
          full_name: v.full_name,
          phone: v.phone,
          national_id: v.national_id ?? "",
          email: v.email ?? "",
        },
      });
      return req<Tenancy>(api, "POST", "/api/v1/tenancies/", {
        body: {
          resident_public_id: resident.public_id,
          unit_public_id: v.unit_public_id,
          start_date: v.start_date,
          contract_months: v.contract_months,
          deposit_amount: v.deposit_amount ?? 0,
          upfront_amount: v.upfront_amount ?? 0,
        },
      });
    },
    onSuccess: () => {
      ["residents", "tenancies", "occupancy", "houses", "units"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      toast({ tone: "success", title: t("tenants.register") });
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("tenants.register")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={submit.isPending} onClick={handleSubmit((v) => submit.mutate(v))}>
            {t("tenants.register")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("tenants.residentName")} error={errors.full_name?.message}>
          <Input {...register("full_name")} />
        </Field>
        <Field label={t("auth.phone")} error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>
        <Field label={t("tenants.nationalId")}>
          <Input {...register("national_id")} />
        </Field>
        <Field label={t("auth.email")}>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label={t("portfolio.unit")} error={errors.unit_public_id?.message} className="sm:col-span-2">
          <UnitPicker
            open={open}
            onChange={(unitId) => setValue("unit_public_id", unitId, { shouldValidate: true })}
          />
        </Field>
        <Field label={t("tenants.startDate")} error={errors.start_date?.message}>
          <Input type="date" {...register("start_date")} />
        </Field>
        <Field label={t("tenants.contractMonths")} error={errors.contract_months?.message}>
          <Input type="number" {...register("contract_months")} />
        </Field>
        <Field label={t("tenants.deposit")}>
          <Input type="number" {...register("deposit_amount")} />
        </Field>
        <Field label={t("tenants.upfront")}>
          <Input type="number" {...register("upfront_amount")} />
        </Field>
      </div>
    </Modal>
  );
}

/**
 * Searchable, debounced vacant-room picker. Replaces a plain <select> that
 * silently truncated to one page of results on large portfolios — this
 * queries the backend as the owner types instead of loading everything.
 */
function UnitPicker({ open, onChange }: { open: boolean; onChange: (unitPublicId: string) => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<Unit | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Clear any stale selection when the modal is reopened.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      setSelected(null);
    }
  }, [open]);

  const results = useQuery({
    queryKey: ["units", "vacant", "search", debounced],
    enabled: open,
    queryFn: () =>
      req<Paginated<Unit>>(api, "GET", "/api/v1/units/", {
        params: { query: { status: "vacant", search: debounced, page_size: 20, ordering: "house__name,label" } },
      }),
  });

  const pick = (u: Unit) => {
    setSelected(u);
    setQuery("");
    onChange(u.public_id);
    setFocused(false);
  };

  const showDropdown = focused && !selected;
  const units = results.data?.results ?? [];

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input
          className="pl-9"
          placeholder={t("common.searchPlaceholder")}
          value={selected ? roomBreadcrumb(selected.compound_name, selected.house_name, selected.label) : query}
          onChange={(e) => {
            setSelected(null);
            onChange("");
            setQuery(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so a click on a dropdown item registers before we close it.
            blurTimer.current = setTimeout(() => setFocused(false), 150);
          }}
        />
      </div>
      {showDropdown && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-pop">
          {results.isLoading ? (
            <p className="px-3 py-2 text-sm text-ink-muted">{t("common.loading")}</p>
          ) : units.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-muted">{t("common.noResults")}</p>
          ) : (
            units.map((u) => (
              <button
                key={u.public_id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas"
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  pick(u);
                }}
              >
                <span className="text-ink">{roomBreadcrumb(u.compound_name, u.house_name, u.label)}</span>
                <span className="text-ink-muted">{u.monthly_rent}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
