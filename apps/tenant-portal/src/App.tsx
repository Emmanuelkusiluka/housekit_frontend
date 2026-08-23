import { LoginScreen } from "@housekit/app-kit";
import { RequireAuth } from "@housekit/auth";
import { Spinner } from "@housekit/ui";
import { Route, Routes } from "react-router-dom";

import { PortalLayout } from "./layout/PortalLayout";
import { MyLease } from "./pages/MyLease";
import { MyPayments } from "./pages/MyPayments";
import { Profile } from "./pages/Profile";
import { Receipts } from "./pages/Receipts";

const loader = (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner />
  </div>
);

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen accent="Housekit" />} />
      <Route
        element={
          <RequireAuth fallback={loader}>
            <PortalLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<MyLease />} />
        <Route path="/payments" element={<MyPayments />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
