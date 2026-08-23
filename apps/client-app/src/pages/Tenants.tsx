import { zodResolver } from "@hookform/resolvers/zod";
import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
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
  Select,
  StatusPill,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, UserPlus, Users } from "lucide-react";
import { useState } from "react";
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

export function Tenants() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isOwner = user?.role === "client_admin";
  const [showReg, setShowReg] = useState(false);

  const residents = useQuery({
    queryKey: ["residents"],
    queryFn: () => req<Paginated<Resident>>(api, "GET", "/api/v1/residents/"),
  });
  const tenancies = useQuery({
    queryKey: ["tenancies", "active"],
    queryFn: () => req<Paginated<Tenancy>>(api, "GET", "/api/v1/tenancies/", { params: { query: { status: "active" } } }),
  });

  const activeByResident = new Map<string, Tenancy>();
  tenancies.data?.results.forEach((tn) => activeByResident.set(tn.resident, tn));

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

  const cols: Column<Resident>[] = [
    { key: "name", header: t("tenants.residentName"), render: (r) => <span className="font-medium">{r.full_name}</span> },
    {
      key: "unit",
      header: t("portfolio.unit"),
      render: (r) => activeByResident.get(r.public_id)?.unit_label ?? "—",
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
      <DataTable
        columns={cols}
        rows={residents.data?.results ?? []}
        keyOf={(r) => r.public_id}
        loading={residents.isLoading}
        empty={<EmptyState icon={<Users className="h-10 w-10" />} title={t("tenants.noTenants")} />}
      />
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
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { contract_months: 12 } });

  const vacant = useQuery({
    queryKey: ["units", "vacant"],
    enabled: open,
    queryFn: () =>
      req<Paginated<Unit>>(api, "GET", "/api/v1/units/", { params: { query: { status: "vacant" } } }),
  });

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
      ["residents", "tenancies", "occupancy", "houses"].forEach((k) =>
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
          <Select {...register("unit_public_id")}>
            <option value="">—</option>
            {vacant.data?.results.map((u) => (
              <option key={u.public_id} value={u.public_id}>
                {u.house_name} · {u.label} ({u.monthly_rent})
              </option>
            ))}
          </Select>
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
