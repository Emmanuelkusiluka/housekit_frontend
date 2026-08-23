import { useTranslation } from "@housekit/i18n";
import { Drawer, EmptyState, NotificationBell } from "@housekit/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { useState } from "react";

import { type Paginated, req } from "./api";
import { useApi } from "./providers";

interface Notification {
  public_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationsButton() {
  const api = useApi();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => req<{ unread: number }>(api, "GET", "/api/v1/notifications/unread_count/"),
    refetchInterval: 60_000,
  });

  const list = useQuery({
    queryKey: ["notifications", "list"],
    enabled: open,
    queryFn: () => req<Paginated<Notification>>(api, "GET", "/api/v1/notifications/"),
  });

  const markAll = useMutation({
    mutationFn: () => req(api, "POST", "/api/v1/notifications/read_all/"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <>
      <NotificationBell count={unread.data?.unread ?? 0} onClick={() => setOpen(true)} />
      <Drawer open={open} onOpenChange={setOpen} title={t("nav.notifications")}>
        {list.data && list.data.results.length > 0 ? (
          <div className="space-y-2">
            <button
              onClick={() => markAll.mutate()}
              className="text-sm text-brand-600 hover:underline"
            >
              {t("common.confirm")} · {t("common.all")}
            </button>
            {list.data.results.map((n) => (
              <div
                key={n.public_id}
                className={`rounded-xl border border-line p-3 ${n.is_read ? "opacity-60" : "bg-brand-50/40"}`}
              >
                <p className="text-sm font-medium text-ink">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<BellOff className="h-8 w-8" />} title={t("common.noResults")} />
        )}
      </Drawer>
    </>
  );
}
