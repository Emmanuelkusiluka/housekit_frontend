import { useTranslation } from "@housekit/i18n";
import { Button, Field, Input, Menu, MenuItem, Modal, Textarea, useToast } from "@housekit/ui";
import { useMutation } from "@tanstack/react-query";
import { Bug, LifeBuoy, MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import { req } from "./api";
import { useApi } from "./providers";

export function SupportWidget() {
  const api = useApi();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [mode, setMode] = useState<null | "ticket" | "bug">(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const ticket = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/tickets/", { body: { subject, body: message, category: "other" } }),
    onSuccess: () => {
      toast({ tone: "success", title: t("support.newTicket") });
      reset();
    },
  });

  const bug = useMutation({
    mutationFn: () =>
      req(api, "POST", "/api/v1/bug-reports/", {
        body: {
          description: message,
          context_json: { route: window.location.pathname, ua: navigator.userAgent },
        },
      }),
    onSuccess: () => {
      toast({ tone: "success", title: t("support.reportBug") });
      reset();
    },
  });

  function reset() {
    setMode(null);
    setSubject("");
    setMessage("");
  }

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 md:bottom-6">
        <Menu
          trigger={
            <button
              aria-label={t("support.widgetHelp")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop hover:bg-brand-700"
            >
              <LifeBuoy className="h-5 w-5" />
            </button>
          }
        >
          <MenuItem onSelect={() => setMode("ticket")}>
            <span className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" /> {t("support.newTicket")}
            </span>
          </MenuItem>
          <MenuItem onSelect={() => setMode("bug")}>
            <span className="flex items-center gap-2">
              <Bug className="h-4 w-4" /> {t("support.reportBug")}
            </span>
          </MenuItem>
        </Menu>
      </div>

      <Modal
        open={mode !== null}
        onOpenChange={(o) => !o && reset()}
        title={mode === "bug" ? t("support.reportBug") : t("support.newTicket")}
        footer={
          <>
            <Button variant="ghost" onClick={reset}>
              {t("common.cancel")}
            </Button>
            <Button
              loading={ticket.isPending || bug.isPending}
              onClick={() => (mode === "bug" ? bug.mutate() : ticket.mutate())}
              disabled={!message || (mode === "ticket" && !subject)}
            >
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {mode === "ticket" && (
            <Field label={t("support.subject")}>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          )}
          <Field label={t("support.message")}>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
