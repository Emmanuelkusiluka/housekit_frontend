import { AppProviders } from "@housekit/app-kit";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { authConfig } from "./config";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders authConfig={authConfig} subscriptionPath="/subscription">
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
