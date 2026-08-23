import { Paginated, req, useApi, useToast } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import {
  Button,
  Card,
  CardBody,
  Drawer,
  EmptyState,
  Field,
  PageHeader,
  StatusPill,
  Textarea,
} from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { useState } from "react";

interface TicketMessage {
  public_id: string;
  author_type: string;
  author_label: string;
  body: string;
  created_at: string;
}
interface Ticket {
  public_id: string;
  ticket_no: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  messages: TicketMessage[];
  created_at: string;
}

export function Support() {
  const { t } = useTranslation();
  const api = useApi();
  const [openId, setOpenId] = useState<string | null>(null);

  const tickets = useQuery({
    queryKey: ["tickets"],
    queryFn: () => req<Paginated<Ticket>>(api, "GET", "/api/v1/tickets/"),
  });

  const active = tickets.data?.results.find((x) => x.public_id === openId) ?? null;

  return (
    <div>
      <PageHeader title={t("support.title")} description={t("support.widgetHelp")} />
      {tickets.data && tickets.data.results.length > 0 ? (
        <div className="space-y-2">
          {tickets.data.results.map((tk) => (
            <Card key={tk.public_id}>
              <CardBody className="flex cursor-pointer items-center justify-between" onClick={() => setOpenId(tk.public_id)}>
                <div>
                  <p className="font-medium text-ink">
                    {tk.ticket_no} · {tk.subject}
                  </p>
                  <p className="text-sm text-ink-muted">{tk.messages.length} messages</p>
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
  const [reply, setReply] = useState("");

  const send = useMutation({
    mutationFn: () => req(api, "POST", `/api/v1/tickets/${ticket!.public_id}/reply/`, { body: { body: reply } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      setReply("");
      toast({ tone: "success", title: t("support.reply") });
    },
  });
  const reopen = useMutation({
    mutationFn: () => req(api, "POST", `/api/v1/tickets/${ticket!.public_id}/reopen/`, { body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      toast({ tone: "success", title: t("support.reopen") });
    },
  });

  return (
    <Drawer open={ticket !== null} onOpenChange={(o) => !o && onClose()} title={ticket?.subject}>
      {ticket && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusPill status={ticket.status} />
            {ticket.status === "resolved" && (
              <Button size="sm" variant="outline" onClick={() => reopen.mutate()}>
                {t("support.reopen")}
              </Button>
            )}
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
          <Button className="w-full" loading={send.isPending} disabled={!reply} onClick={() => send.mutate()}>
            {t("support.reply")}
          </Button>
        </div>
      )}
    </Drawer>
  );
}
