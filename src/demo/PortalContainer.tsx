import { createContext, useContext } from "react";
export const PortalContainerContext = createContext<HTMLElement | null>(null);
export function usePortalContainer() {
  const container = useContext(PortalContainerContext);
  if (!container) throw new Error("Demo temporarily unavailable.");
  return container;
}
