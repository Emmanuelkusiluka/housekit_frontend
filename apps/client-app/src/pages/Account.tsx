import { ChangePasswordCard, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Avatar, Badge, Button, Card, CardBody, CardHeader, CardTitle, Field, Input, PageHeader, Skeleton } from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface AccountInfo {
  public_id: string;
  business_name: string;
  status: string;
  currency: string;
}

/** Account & security — one place for profile, business details and password. */
export function Account() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const isOwner = user?.role === "client_admin";

  const account = useQuery({
    queryKey: ["account"],
    enabled: isOwner,
    queryFn: () => req<AccountInfo>(api, "GET", "/api/v1/account/"),
  });

  const [me, setMe] = useState({ full_name: user?.full_name ?? "", phone: String(user?.phone ?? "") });
  const [business, setBusiness] = useState("");
  useEffect(() => {
    if (account.data) setBusiness(account.data.business_name);
  }, [account.data]);

  // Only owners can edit staff profiles (backend `IsClientAdmin`), which
  // includes their own. Caretakers see their details read-only.
  const saveMe = useMutation({
    mutationFn: () => req(api, "PATCH", `/api/v1/users/${user?.public_id}/`, { body: me }),
    onSuccess: async () => {
      await refreshUser();
      toast({ tone: "success", title: t("ux.saved") });
    },
  });
  const saveBusiness = useMutation({
    mutationFn: () => req(api, "PATCH", "/api/v1/account/", { body: { business_name: business } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account"] });
      toast({ tone: "success", title: t("ux.saved") });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t("ux.accountSettings")} />

      <Card>
        <CardBody className="flex items-center gap-4">
          <Avatar name={user?.full_name || user?.email || "?"} size="xl" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-ink">{user?.full_name}</p>
            <p className="truncate text-sm text-ink-muted">{user?.email}</p>
            <Badge tone="brand" className="mt-1">
              {isOwner ? t("ux.roleOwner") : t("ux.roleCaretaker")}
            </Badge>
          </div>
        </CardBody>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ux.yourDetails")}</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label={t("auth.fullName")}>
              <Input value={me.full_name} onChange={(e) => setMe({ ...me, full_name: e.target.value })} />
            </Field>
            <Field label={t("auth.phone")}>
              <Input type="tel" value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button loading={saveMe.isPending} disabled={!me.full_name.trim()} onClick={() => saveMe.mutate()}>
                {t("common.save")}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ux.business")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {account.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Field label={t("auth.businessName")} hint={t("ux.businessHint")}>
                <Input value={business} onChange={(e) => setBusiness(e.target.value)} />
              </Field>
            )}
            <Button
              loading={saveBusiness.isPending}
              disabled={!business.trim() || business === account.data?.business_name}
              onClick={() => saveBusiness.mutate()}
            >
              {t("common.save")}
            </Button>
          </CardBody>
        </Card>
      )}

      <ChangePasswordCard />
    </div>
  );
}
