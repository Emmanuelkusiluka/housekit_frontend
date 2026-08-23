import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog } from "lucide-react";
import { useState } from "react";

import type { CaretakerAssignment, House, StaffUser } from "../types";

export function Caretakers() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [invite, setInvite] = useState(false);
  const [assignFor, setAssignFor] = useState<StaffUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "" });

  const staff = useQuery({
    queryKey: ["users"],
    queryFn: () => req<Paginated<StaffUser>>(api, "GET", "/api/v1/users/"),
  });
  const assignments = useQuery({
    queryKey: ["caretaker-assignments"],
    queryFn: () => req<Paginated<CaretakerAssignment>>(api, "GET", "/api/v1/caretaker-assignments/"),
  });

  const caretakers = staff.data?.results.filter((u) => u.role === "caretaker") ?? [];
  const byCaretaker = new Map<string, CaretakerAssignment[]>();
  assignments.data?.results.forEach((a) => {
    const arr = byCaretaker.get(a.caretaker) ?? [];
    arr.push(a);
    byCaretaker.set(a.caretaker, arr);
  });

  const doInvite = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/users/invite", { body: { ...inviteForm, role: "caretaker" } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      toast({ tone: "success", title: t("onboarding.step3") });
      setInvite(false);
      setInviteForm({ full_name: "", email: "" });
    },
  });

  return (
    <div>
      <PageHeader
        title={t("nav.caretakers")}
        action={
          <Button onClick={() => setInvite(true)}>
            <Plus className="h-4 w-4" /> {t("onboarding.step3")}
          </Button>
        }
      />
      {caretakers.length > 0 ? (
        <div className="space-y-2">
          {caretakers.map((c) => (
            <Card key={c.public_id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{c.full_name}</p>
                  <p className="text-sm text-ink-muted">{c.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(byCaretaker.get(c.public_id) ?? []).map((a) => (
                      <Badge key={a.public_id} tone="brand">
                        {a.house_name}
                      </Badge>
                    ))}
                    {(byCaretaker.get(c.public_id) ?? []).length === 0 && (
                      <span className="text-xs text-ink-subtle">{t("common.none")}</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAssignFor(c)}>
                  {t("platform.assign")}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<UserCog className="h-10 w-10" />} title={t("common.noResults")} />
      )}

      <Modal
        open={invite}
        onOpenChange={setInvite}
        title={t("onboarding.step3")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInvite(false)}>
              {t("common.cancel")}
            </Button>
            <Button loading={doInvite.isPending} disabled={!inviteForm.email} onClick={() => doInvite.mutate()}>
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("auth.fullName")}>
            <Input value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} />
          </Field>
          <Field label={t("auth.email")}>
            <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {assignFor && <AssignModal caretaker={assignFor} onClose={() => setAssignFor(null)} />}
    </div>
  );
}

function AssignModal({ caretaker, onClose }: { caretaker: StaffUser; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [house, setHouse] = useState("");

  const houses = useQuery({
    queryKey: ["houses"],
    queryFn: () => req<Paginated<House>>(api, "GET", "/api/v1/houses/"),
  });

  const assign = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/caretaker-assignments/", {
        body: { caretaker_public_id: caretaker.public_id, house_public_id: house },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["caretaker-assignments"] });
      toast({ tone: "success", title: t("platform.assign") });
      onClose();
    },
  });

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${t("platform.assign")} — ${caretaker.full_name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={assign.isPending} disabled={!house} onClick={() => assign.mutate()}>
            {t("platform.assign")}
          </Button>
        </>
      }
    >
      <Field label={t("portfolio.house")}>
        <Select value={house} onChange={(e) => setHouse(e.target.value)}>
          <option value="">—</option>
          {houses.data?.results.map((h) => (
            <option key={h.public_id} value={h.public_id}>
              {h.name}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
