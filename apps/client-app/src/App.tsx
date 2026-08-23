import { RequireAuth, RequireRole } from "@housekit/auth";
import { Spinner } from "@housekit/ui";
import { Route, Routes } from "react-router-dom";

import { ClientLayout } from "./layout/ClientLayout";
import { Caretakers } from "./pages/Caretakers";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { HouseDetail } from "./pages/HouseDetail";
import { Leases } from "./pages/Leases";
import { Login } from "./pages/Login";
import { Maintenance } from "./pages/Maintenance";
import { Payments } from "./pages/Payments";
import { Portfolio } from "./pages/Portfolio";
import { Reports } from "./pages/Reports";
import { Setup } from "./pages/Setup";
import { Signup } from "./pages/Signup";
import { Subscription } from "./pages/Subscription";
import { Support } from "./pages/Support";
import { Tenants } from "./pages/Tenants";

const loader = (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner />
  </div>
);

const owner = (el: JSX.Element) => <RequireRole roles={["client_admin"]}>{el}</RequireRole>;

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        element={
          <RequireAuth fallback={loader}>
            <ClientLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={owner(<Setup />)} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/portfolio/houses/:houseId" element={<HouseDetail />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/leases" element={owner(<Leases />)} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/expenses" element={owner(<Expenses />)} />
        <Route path="/reports" element={owner(<Reports />)} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/caretakers" element={owner(<Caretakers />)} />
        <Route path="/subscription" element={owner(<Subscription />)} />
        <Route path="/support" element={<Support />} />
      </Route>
    </Routes>
  );
}
