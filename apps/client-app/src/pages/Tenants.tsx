import { zodResolver } from "@hookform/resolvers/zod";
import { Paginated, req, roomBreadcrumb, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Badge,
  Button,
  Column,
  DataTable,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuItem,
  Modal,
  PageHeader,
  StatusPill,
  TabsBar,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Search, UserPlus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
type TenantTab = "active" | "previous";

export function Tenants() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isOwner = user?.role === "client_admin";
  const [showReg, setShowReg] = useState(false);
  const [tab, setTab] = useState<TenantTab>("active");

  const residents = useQuery({
    queryKey: ["residents"],
    queryFn: () => req<Paginated<Resident>>(api, "GET", "/api/v1/residents/", { params: { query: { page_size: 100 } } }),
  });
  // All tenancies (not just active) — "previous tenants" needs the moved-out
  // ones too, to show where they used to live and when they left.
  const tenancies = useQuery({
    queryKey: ["tenancies", "all"],
    queryFn: () => req<Paginated<Tenancy>>(api, "GET", "/api/v1/tenancies/", { params: { query: { page_size: 100 } } }),
  });

  const activeByResident = new Map<string, Tenancy>();
  const lastMovedOutByResident = new Map<string, Tenancy>();
  tenancies.data?.results.forEach((tn) => {
    if (tn.status === "active") {
      activeByResident.set(tn.resident, tn);
    } else {
      const existing = lastMovedOutByResident.get(tn.resident);
      if (!existing || (tn.move_out_date ?? "") > (existing.move_out_date ?? "")) {
        lastMovedOutByResident.set(tn.resident, tn);
      }
    }
  });

  const allResidents = residents.data?.results ?? [];
  const activeResidents = allResidents.filter((r) => activeByResident.has(r.public_id));
  const previousResidents = allResidents.filter((r) => !activeByResident.has(r.public_id));

  const verify = useMutation({
    mutationFn: (id: string) => req(api, "POST", `/api/v1/residents/${id}/verify/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["residents"] });
      toast({ tone: "success", title: t("tenants.verified") });
    },
  });
  const grant = useMutation({
    mutationFn: (id: string) => req(api, "POST", `/api/v1/residents/${id}/grant_portal/`, { body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["residents"] });
      toast({ tone: "success", title: t("tenants.grantPortal") });
    },
  });
  const moveOut = useMutation({
    mutationFn: (tenancyId: string) =>
      req(api, "POST", `/api/v1/tenancies/${tenancyId}/move_out/`, {
        body: { move_out_date: new Date().toISOString().slice(0, 10) },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenancies"] });
      void qc.invalidateQueries({ queryKey: ["occupancy"] });
      toast({ tone: "success", title: t("tenants.moveOut") });
    },
  });

  const activeCols: Column<Resident>[] = [
    { key: "name", header: t("tenants.residentName"), render: (r) => <span className="font-medium">{r.full_name}</span> },
    {
      key: "unit",
      header: t("portfolio.unit"),
      render: (r) => {
        const tn = activeByResident.get(r.public_id);
        if (!tn) return "—";
        return <span>{roomBreadcrumb(tn.compound_name, tn.house_name, tn.unit_label)}</span>;
      },
    },
    {
      key: "verify",
      header: t("common.status"),
      render: (r) => <StatusPill status={r.verification_status} />,
    },
    {
      key: "portal",
      header: t("tenants.grantPortal"),
      hideOnMobile: true,
      render: (r) =>
        r.has_portal_access ? <Badge tone="success">✓</Badge> : <span className="text-ink-subtle">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => {
        const tn = activeByResident.get(r.public_id);
        return (
          <Menu
            trigger={
              <button className="rounded-lg p-1 text-ink-muted hover:bg-canvas">
                <MoreVertical className="h-4 w-4" />
              </button>
            }
          >
            {isOwner && r.verification_status !== "verified" && (
              <MenuItem onSelect={() => verify.mutate(r.public_id)}>{t("tenants.verify")}</MenuItem>
            )}
            {isOwner && !r.has_portal_access && (
              <MenuItem onSelect={() => grant.mutate(r.public_id)}>{t("tenants.grantPortal")}</MenuItem>
            )}
            {tn && (
              <MenuItem danger onSelect={() => moveOut.mutate(tn.public_id)}>
                {t("tenants.moveOut")}
              </MenuItem>
            )}
          </Menu>
        );
      },
    },
  ];

  const previousCols: Column<Resident>[] = [
    { key: "name", header: t("tenants.residentName"), render: (r) => <span className="font-medium">{r.full_name}</span> },
    {
      key: "unit",
      header: t("portfolio.unit"),
      render: (r) => {
        const tn = lastMovedOutByResident.get(r.public_id);
        if (!tn) return "—";
        return <span className="text-ink-muted">{roomBreadcrumb(tn.compound_name, tn.house_name, tn.unit_label)}</span>;
      },
    },
    {
      key: "movedOut",
      header: t("tenants.moveOutDate"),
      render: (r) => lastMovedOutByResident.get(r.public_id)?.move_out_date ?? "—",
    },
  ];

  const active = tab === "active";

  return (
    <div>
      <PageHeader
        title={t("tenants.title")}
        action={
          <Button onClick={() => setShowReg(true)}>
            <UserPlus className="h-4 w-4" /> {t("tenants.register")}
          </Button>
        }
      />
      <TabsBar
        className="mb-4"
        value={tab}
        onValueChange={(v) => setTab(v as TenantTab)}
        tabs={[
          { value: "active", label: `${t("tenants.title")} (${activeResidents.length})` },
          { value: "previous", label: `${t("tenants.previousTenants")} (${previousResidents.length})` },
        ]}
      />
      {active ? (
        <DataTable
          columns={activeCols}
          rows={activeResidents}
          keyOf={(r) => r.public_id}
          loading={residents.isLoading || tenancies.isLoading}
          empty={<EmptyState icon={<Users className="h-10 w-10" />} title={t("tenants.noTenants")} />}
        />
      ) : (
        <DataTable
          columns={previousCols}
          rows={previousResidents}
          keyOf={(r) => r.public_id}
          loading={residents.isLoading || tenancies.isLoading}
          empty={<EmptyState icon={<Users className="h-10 w-10" />} title={t("common.noResults")} />}
        />
      )}
      <RegisterModal open={showReg} onClose={() => setShowReg(false)} />
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
