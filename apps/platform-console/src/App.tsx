import { LoginScreen } from "@housekit/app-kit";
import { RequireAuth } from "@housekit/auth";
import { Spinner } from "@housekit/ui";
import { Route, Routes } from "react-router-dom";

import { ConsoleLayout } from "./layout/ConsoleLayout";
import { Accounts } from "./pages/Accounts";
import { Applications } from "./pages/Applications";
import { Billing } from "./pages/Billing";
import { Mail } from "./pages/Mail";
import { SupportDesk } from "./pages/SupportDesk";

const loader = (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner />
  </div>
);

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen accent="Housekit Admin" title="Operator sign in" />} />
      <Route
        element={
          <RequireAuth fallback={loader}>
            <ConsoleLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Applications />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/support" element={<SupportDesk />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/mail" element={<Mail />} />
      </Route>
    </Routes>
  );
}
