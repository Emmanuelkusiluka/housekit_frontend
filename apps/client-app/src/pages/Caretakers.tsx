import { fetchAll, matchesSearch, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  Field,
  GhostAvatar,
  Input,
  Menu,
  MenuItem,
  Modal,
  PageHeader,
  PersonRowSkeleton,
  SearchInput,
  Select,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, X } from "lucide-react";
import { useState } from "react";

import type { CaretakerAssignment, House, StaffUser } from "../types";

export function Caretakers() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [invite, setInvite] = useState(false);
  const [assignFor, setAssignFor] = useState<StaffUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "", phone: "" });
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<
    | { kind: "unassign"; a: CaretakerAssignment }
    | { kind: "deactivate"; u: StaffUser }
    | null
  >(null);

  const staff = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchAll<StaffUser>(api, "/api/v1/users/"),
  });
  const assignments = useQuery({
    queryKey: ["caretaker-assignments"],
    queryFn: () => fetchAll<CaretakerAssignment>(api, "/api/v1/caretaker-assignments/"),
  });

  const caretakers = (staff.data ?? []).filter((u) => u.role === "caretaker" && u.public_id !== user?.public_id);
  const byCaretaker = new Map<string, CaretakerAssignment[]>();
  assignments.data?.forEach((a) => {
    const arr = byCaretaker.get(a.caretaker) ?? [];
    arr.push(a);
    byCaretaker.set(a.caretaker, arr);
  });
  const shown = caretakers
    .filter((c) =>
      matchesSearch(search, [c.full_name, c.email, c.phone, ...(byCaretaker.get(c.public_id) ?? []).map((a) => a.house_name)]),
    )
    .sort((a, b) => Number(b.is_active) - Number(a.is_active));

  const doInvite = useMutation({
    mutationFn: () => req(api, "POST", "/api/v1/users/invite", { body: { ...inviteForm, role: "caretaker" } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      toast({ tone: "success", title: t("ux.inviteSent"), description: t("ux.inviteSentBody") });
      setInvite(false);
      setInviteForm({ full_name: "", email: "", phone: "" });
    },
  });
  // The invite email carries a one-time code. If it got lost, the reset
  // endpoint re-sends a fresh one — no new API needed.
  const resendInvite = useMutation({
    mutationFn: (email: string) => req(api, "POST", "/api/v1/auth/password/reset", { body: { email } }),
    onSuccess: () => toast({ tone: "success", title: t("ux.inviteResent") }),
  });
  const unassign = useMutation({
    mutationFn: (id: string) => req(api, "DELETE", `/api/v1/caretaker-assignments/${id}/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["caretaker-assignments"] });
      setConfirm(null);
      toast({ tone: "success", title: t("ux.unassigned") });
    },
  });
  const setActive = useMutation({
    mutationFn: (v: { id: string; active: boolean }) =>
      v.active
        ? req(api, "PATCH", `/api/v1/users/${v.id}/`, { body: { is_active: true } })
        : req(api, "DELETE", `/api/v1/users/${v.id}/`),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      setConfirm(null);
      toast({ tone: "success", title: v.active ? t("ux.caretakerReactivated") : t("ux.caretakerDeactivated") });
    },
  });

  return (
    <div>
      <PageHeader
        title={t("nav.caretakers")}
        description={t("ux.caretakersHint")}
        action={
          <Button onClick={() => setInvite(true)}>
            <Plus className="h-4 w-4" /> {t("onboarding.step3")}
          </Button>
        }
      />
      {caretakers.length > 5 && (
        <SearchInput className="mb-4 max-w-md" value={search} onChange={setSearch} placeholder={t("ux.searchCaretakers")} />
      )}
      {staff.isLoading ? (
        <PersonRowSkeleton rows={3} />
      ) : caretakers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 py-12 text-center">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={user?.full_name ?? "?"} size="xl" />
            <Plus className="h-5 w-5 text-ink-subtle" />
            <GhostAvatar size="xl" />
          </div>
          <p className="font-display text-base font-semibold text-ink">{t("ux.caretakersEmptyTitle")}</p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">{t("ux.caretakersEmptyBody")}</p>
          <Button className="mt-4" onClick={() => setInvite(true)}>
            <Plus className="h-4 w-4" /> {t("onboarding.step3")}
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <EmptyState ghosts={1} title={t("ux.noMatchTitle", { query: search })} />
      ) : (
        <div className="space-y-2">
          {shown.map((c) => {
            const houses = byCaretaker.get(c.public_id) ?? [];
            return (
              <Card key={c.public_id} className={c.is_active ? "" : "opacity-70"}>
                <CardBody className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar name={c.full_name || c.email} size="lg" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        {c.full_name || c.email}
                        {!c.is_active && <Badge>{t("ux.deactivated")}</Badge>}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {c.email}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {houses.map((a) => (
                          <Badge key={a.public_id} tone="brand" className="gap-1 pr-1">
                            {a.house_name}
                            <button
                              aria-label={t("ux.unassignFrom", { house: a.house_name })}
                              title={t("ux.unassignFrom", { house: a.house_name })}
                              className="rounded-full p-0.5 hover:bg-brand-100"
                              onClick={() => setConfirm({ kind: "unassign", a })}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {houses.length === 0 && <span className="text-xs text-ink-subtle">{t("ux.noHousesAssigned")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.is_active && (
                      <Button size="sm" variant="outline" onClick={() => setAssignFor(c)}>
                        {t("platform.assign")}
                      </Button>
                    )}
                    <Menu
                      trigger={
                        <button className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas" aria-label={t("common.actions")}>
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                    >
                      {c.is_active && (
                        <MenuItem onSelect={() => resendInvite.mutate(c.email)}>{t("ux.resendInvite")}</MenuItem>
                      )}
                      {c.is_active ? (
                        <MenuItem danger onSelect={() => setConfirm({ kind: "deactivate", u: c })}>
                          {t("ux.deactivate")}
                        </MenuItem>
                      ) : (
                        <MenuItem onSelect={() => setActive.mutate({ id: c.public_id, active: true })}>
                          {t("ux.reactivate")}
                        </MenuItem>
                      )}
                    </Menu>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={invite}
        onOpenChange={setInvite}
        title={t("onboarding.step3")}
        description={t("ux.inviteHint")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInvite(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              loading={doInvite.isPending}
              disabled={!inviteForm.email || !inviteForm.full_name.trim()}
              onClick={() => doInvite.mutate()}
            >
              {t("ux.sendInvite")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("auth.fullName")} required>
            <Input value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} />
          </Field>
          <Field label={t("auth.email")} required>
            <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
          </Field>
          <Field label={`${t("auth.phone")} (${t("common.optional")})`}>
            <Input type="tel" value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {assignFor && (
        <AssignModal
          caretaker={assignFor}
          already={new Set((byCaretaker.get(assignFor.public_id) ?? []).map((a) => a.house))}
          onClose={() => setAssignFor(null)}
        />
      )}

      <ConfirmDialog
        open={confirm?.kind === "unassign"}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone="primary"
        media={confirm?.kind === "unassign" ? <Avatar name={confirm.a.caretaker_name} size="lg" /> : undefined}
        title={
          confirm?.kind === "unassign"
            ? t("ux.unassignTitle", { name: confirm.a.caretaker_name, house: confirm.a.house_name })
            : ""
        }
        description={t("ux.unassignBody")}
        confirmLabel={t("ux.unassign")}
        loading={unassign.isPending}
        onConfirm={() => confirm?.kind === "unassign" && unassign.mutate(confirm.a.public_id)}
      />
      <ConfirmDialog
        open={confirm?.kind === "deactivate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        media={confirm?.kind === "deactivate" ? <Avatar name={confirm.u.full_name || confirm.u.email} size="lg" /> : undefined}
        title={confirm?.kind === "deactivate" ? t("ux.deactivateTitle", { name: confirm.u.full_name || confirm.u.email }) : ""}
        description={t("ux.deactivateBody")}
        confirmLabel={t("ux.deactivate")}
        loading={setActive.isPending}
        onConfirm={() => confirm?.kind === "deactivate" && setActive.mutate({ id: confirm.u.public_id, active: false })}
      />
    </div>
  );
}

function AssignModal({ caretaker, already, onClose }: { caretaker: StaffUser; already: Set<string>; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [house, setHouse] = useState("");

  const houses = useQuery({
    queryKey: ["houses", "all"],
    queryFn: () => fetchAll<House>(api, "/api/v1/houses/", { ordering: "name" }),
  });
  const options = (houses.data ?? []).filter((h) => !already.has(h.public_id));

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
          {options.map((h) => (
            <option key={h.public_id} value={h.public_id}>
              {h.compound_name ? `${h.compound_name} · ${h.name}` : h.name}
            </option>
          ))}
        </Select>
      </Field>
      {options.length === 0 && !houses.isLoading && (
        <p className="mt-2 text-sm text-ink-muted">{t("ux.allHousesAssigned")}</p>
      )}
    </Modal>
  );
}
