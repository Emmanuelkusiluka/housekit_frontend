import { req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, Field, Input, PageHeader, Skeleton, StatusPill } from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Profile as ProfileT } from "../types";

export function Profile() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<ProfileT>>({});

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => req<ProfileT>(api, "GET", "/api/v1/portal/profile/"),
  });

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      req(api, "PATCH", "/api/v1/portal/profile/", {
        body: {
          national_id: form.national_id ?? "",
          phone: form.phone ?? "",
          email: form.email ?? "",
          emergency_contact_name: form.emergency_contact_name ?? "",
          emergency_contact_phone: form.emergency_contact_phone ?? "",
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ tone: "success", title: t("common.save") });
    },
  });

  if (profile.isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  const set = (k: keyof ProfileT) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("nav.profile")}
        action={<StatusPill status={profile.data?.verification_status ?? "unverified"} />}
      />
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label={t("tenants.nationalId")} className="sm:col-span-2">
            <Input value={form.national_id ?? ""} onChange={set("national_id")} />
          </Field>
          <Field label={t("auth.phone")}>
            <Input value={form.phone ?? ""} onChange={set("phone")} />
          </Field>
          <Field label={t("auth.email")}>
            <Input type="email" value={form.email ?? ""} onChange={set("email")} />
          </Field>
          <Field label={t("tenants.emergencyContact")}>
            <Input value={form.emergency_contact_name ?? ""} onChange={set("emergency_contact_name")} />
          </Field>
          <Field label={`${t("tenants.emergencyContact")} — ${t("auth.phone")}`}>
            <Input value={form.emergency_contact_phone ?? ""} onChange={set("emergency_contact_phone")} />
          </Field>
        </CardBody>
      </Card>
      <div className="mt-4">
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
