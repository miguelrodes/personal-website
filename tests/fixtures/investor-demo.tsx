// Local Vite test/review entry only. This is not an input to the production build.
import { lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
const InvestorPortalModal = lazy(() => import("../../src/InvestorPortalModal"));
function Review() {
  const [open, setOpen] = useState(false);
  return <main style={{ padding: 32 }}>
    <h1>Synthetic demo — local review</h1>
    <p>The public demo uses fictional portfolio data.</p>
    <button type="button" onClick={() => setOpen(true)}>Preview synthetic demo</button>
    {open && <Suspense fallback={<p>Loading preview…</p>}><InvestorPortalModal onClose={() => setOpen(false)} /></Suspense>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Review />);
