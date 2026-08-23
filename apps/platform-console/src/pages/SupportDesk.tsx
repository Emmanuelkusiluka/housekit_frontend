import { Paginated, req, useApi, useAuth, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Button,
  Card,
  CardBody,
  Drawer,
  EmptyState,
  Field,
  Input,
  PageHeader,
  StatusPill,
  TabsBar,
  Textarea,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { useState } from "react";

import type { Ticket } from "../types";

export function SupportDesk() {
  const { t } = useTranslation();
  const api = useApi();
  const [filter, setFilter] = useState("open");
  const [openId, setOpenId] = useState<string | null>(null);

  const tickets = useQuery({
    queryKey: ["platform-tickets"],
    queryFn: () => req<Paginated<Ticket>>(api, "GET", "/api/v1/platform/tickets/"),
  });

  const rows =
    tickets.data?.results.filter((tk) => {
      if (filter === "all") return true;
      if (filter === "open") return ["open", "pending", "reopened", "escalated"].includes(tk.status);
      return tk.status === filter;
    }) ?? [];
  const active = tickets.data?.results.find((x) => x.public_id === openId) ?? null;

  return (
    <div>
      <PageHeader title={t("nav.support")} description="Resolution" />
      <TabsBar
        className="mb-4"
        value={filter}
        onValueChange={setFilter}
        tabs={[
          { value: "open", label: t("status.open") },
          { value: "escalated", label: t("status.escalated") },
          { value: "resolved", label: t("status.resolved") },
          { value: "all", label: t("common.all") },
        ]}
      />
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((tk) => (
            <Card key={tk.public_id}>
              <CardBody className="flex cursor-pointer items-center justify-between" onClick={() => setOpenId(tk.public_id)}>
                <div>
                  <p className="font-medium text-ink">
                    {tk.ticket_no} · {tk.subject}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {tk.created_by_name} · {tk.priority}
                  </p>
                </div>
                <StatusPill status={tk.status} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<LifeBuoy className="h-10 w-10" />} title={t("support.noTickets")} />
      )}
      <TicketDrawer ticket={active} onClose={() => setOpenId(null)} />
    </div>
  );
}

function TicketDrawer({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [reply, setReply] = useState("");
  const [kb, setKb] = useState("");

  const mutate = (action: string, body: unknown) =>
    req(api, "POST", `/api/v1/platform/tickets/${ticket!.public_id}/${action}/`, { body });

  const replyM = useMutation({
    mutationFn: () => mutate("reply", { body: reply }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tickets"] });
      setReply("");
    },
  });
  const resolveM = useMutation({
    mutationFn: () => mutate("resolve", { kb_reference: kb }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tickets"] });
      toast({ tone: "success", title: t("support.resolve") });
    },
  });
  const escalateM = useMutation({
    mutationFn: () => mutate("escalate", {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tickets"] });
      toast({ tone: "info", title: t("support.escalate") });
    },
  });
  const assignM = useMutation({
    mutationFn: () => mutate("assign", { assignee_public_id: user!.public_id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tickets"] });
      toast({ tone: "success", title: t("platform.assign") });
    },
  });

  return (
    <Drawer open={!!ticket} onOpenChange={(o) => !o && onClose()} title={ticket?.subject}>
      {ticket && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={ticket.status} />
            <Button size="sm" variant="outline" onClick={() => assignM.mutate()}>
              {t("platform.assign")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => escalateM.mutate()}>
              {t("support.escalate")}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="rounded-xl bg-canvas p-3 text-sm">{ticket.body}</div>
            {ticket.messages.map((m) => (
              <div
                key={m.public_id}
                className={`rounded-xl p-3 text-sm ${m.author_type === "platform" ? "bg-brand-50" : "bg-canvas"}`}
              >
                <p className="mb-0.5 text-xs font-medium text-ink-muted">{m.author_label}</p>
                {m.body}
              </div>
            ))}
          </div>

          <Field label={t("support.reply")}>
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} />
          </Field>
          <Button className="w-full" loading={replyM.isPending} disabled={!reply} onClick={() => replyM.mutate()}>
            {t("support.reply")}
          </Button>

          <div className="rounded-xl border border-line p-3">
            <Field label={t("support.kbReference")}>
              <Input value={kb} onChange={(e) => setKb(e.target.value)} placeholder="kb/rent-overdue" />
            </Field>
            <Button
              className="mt-2 w-full"
              variant="success"
              loading={resolveM.isPending}
              onClick={() => resolveM.mutate()}
            >
              {t("support.resolve")}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
