import { Route, Routes } from "react-router-dom";

import { Apply } from "./pages/Apply";
import { Landing } from "./pages/Landing";
import { Pricing } from "./pages/Pricing";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/apply" element={<Apply />} />
    </Routes>
  );
}
