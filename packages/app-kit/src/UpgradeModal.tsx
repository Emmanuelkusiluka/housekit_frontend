import { useTranslation } from "@housekit/i18n";
import { Button, Modal } from "@housekit/ui";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface UpgradeCtx {
  open: () => void;
}
const Ctx = createContext<UpgradeCtx>({ open: () => {} });

export function UpgradeModalProvider({
  children,
  subscriptionPath = "/subscription",
}: {
  children: ReactNode;
  subscriptionPath?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t("subscription.upgradeRequired")}
        description={t("subscription.upgradeBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                navigate(subscriptionPath);
              }}
            >
              {t("subscription.upgrade")}
            </Button>
          </>
        }
      />
    </Ctx.Provider>
  );
}

export function useUpgradeModal() {
  return useContext(Ctx);
}
