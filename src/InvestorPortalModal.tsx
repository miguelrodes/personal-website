import { Component, Suspense, lazy, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./InvestorPortalModal.css";

const loadInvestorPortalDemo = () => import("./demo/InvestorPortalDemo");
const InvestorPortalDemo = lazy(loadInvestorPortalDemo);
class DemoBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="portal-demo-status" role="status">Demo temporarily unavailable.</p> : this.props.children; }
}

export default function InvestorPortalModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const x = window.scrollX, y = window.scrollY;
    const body = document.body;
    const saved = { position: body.style.position, top: body.style.top, left: body.style.left,
      width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: "fixed", top: `-${y}px`, left: `-${x}px`, width: "100%", overflow: "hidden" });
    dialog.showModal();
    void loadInvestorPortalDemo().catch(() => undefined);
    const loadingTimer = window.setTimeout(() => setShowDemo(true), 700);
    return () => {
      window.clearTimeout(loadingTimer);
      dialog.close();
      Object.assign(body.style, saved);
      window.scrollTo({ left: x, top: y, behavior: "instant" });
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<dialog ref={dialogRef} className="portal-demo-dialog" aria-label="Aldea Investor Portal"
    onClick={e => {
      if (e.target === dialogRef.current) onClose();
    }}
    onKeyDown={e => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      const dialog = dialogRef.current!;
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')]
        .filter(el => !el.closest("[inert], [hidden]") && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}
    onCancel={e => {
      // Radix dismisses the topmost popover/select first. Native selects consume Escape.
      e.preventDefault();
      if (!dialogRef.current?.querySelector('[data-radix-popper-content-wrapper] [data-state="open"], [role="listbox"], [role="tooltip"]')) onClose();
    }}>
    <div className="portal-demo-frame">
      <header className="portal-demo-header">
        <img className="portal-demo-logo" src="/images/aldea-logo.png" alt="Aldea" width="96" height="31" />
        <span className="portal-demo-label"><span aria-hidden="true">-</span><span>Tech Fund I (Synthetic Data)</span></span>
      </header>
      <div ref={scrollRef} className="portal-demo-scroll" tabIndex={-1} role="region" aria-label="Investor report">
        <div ref={setContainer} className="aldea-demo reporting-theme">
          {container && (showDemo ? (
            <DemoBoundary><Suspense fallback={<p className="portal-demo-status portal-demo-loading" role="status">Loading Animation…</p>}>
              <InvestorPortalDemo container={container} scrollContainerRef={scrollRef} />
            </Suspense></DemoBoundary>
          ) : <p className="portal-demo-status portal-demo-loading" role="status">Loading Animation…</p>)}
        </div>
      </div>
    </div>
  </dialog>, document.body);
}
