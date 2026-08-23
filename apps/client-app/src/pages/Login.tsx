import { LoginScreen } from "@housekit/app-kit";
import { useTranslation } from "@housekit/i18n";
import { Link } from "react-router-dom";

export function Login() {
  const { t } = useTranslation();
  return (
    <LoginScreen
      footer={
        <span>
          {t("auth.signupTitle")}?{" "}
          <Link to="/signup" className="font-medium text-brand-600 hover:underline">
            {t("auth.signup")}
          </Link>
        </span>
      }
    />
  );
}
