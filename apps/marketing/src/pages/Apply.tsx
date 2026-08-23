import { useTranslation } from "@housekit/i18n";
import { Button, Card, CardBody, EmptyState, Field, Input, useToast } from "@housekit/ui";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { apiPost } from "../config";
import { MarketingLayout } from "../layout/MarketingLayout";

export function Apply() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState({ business_name: "", contact_name: "", contact_email: "", contact_phone: "" });
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () => apiPost("/api/v1/apply/", form),
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast({ tone: "error", title: e.message }),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-lg px-4 py-16">
        <h1 className="mb-2 text-center font-display text-3xl font-bold">{t("onboarding.talkToUs")}</h1>
        <p className="mb-8 text-center text-ink-muted">{t("onboarding.requestAccount")}</p>
        <Card>
          <CardBody>
            {done ? (
              <EmptyState
                icon={<CheckCircle2 className="h-10 w-10 text-paid" />}
                title={t("common.confirm")}
                description={t("onboarding.requestAccount")}
              />
            ) : (
              <div className="space-y-3">
                <Field label={t("auth.businessName")}>
                  <Input value={form.business_name} onChange={set("business_name")} />
                </Field>
                <Field label={t("auth.fullName")}>
                  <Input value={form.contact_name} onChange={set("contact_name")} />
                </Field>
                <Field label={t("auth.email")}>
                  <Input type="email" value={form.contact_email} onChange={set("contact_email")} />
                </Field>
                <Field label={t("auth.phone")}>
                  <Input value={form.contact_phone} onChange={set("contact_phone")} />
                </Field>
                <Button
                  className="w-full"
                  loading={submit.isPending}
                  disabled={!form.business_name || !form.contact_email}
                  onClick={() => submit.mutate()}
                >
                  {t("onboarding.requestAccount")}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </MarketingLayout>
  );
}
