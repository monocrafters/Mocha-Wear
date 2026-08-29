"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ResellerHeaderDockContextValue = {
  docked: boolean;
  setDocked: (value: boolean) => void;
  toolbar: ReactNode | null;
  setToolbar: (node: ReactNode | null) => void;
};

const ResellerHeaderDockContext = createContext<ResellerHeaderDockContextValue | null>(null);

export function ResellerHeaderDockProvider({ children }: { children: ReactNode }) {
  const [docked, setDocked] = useState(false);
  const [toolbar, setToolbar] = useState<ReactNode | null>(null);

  return (
    <ResellerHeaderDockContext.Provider value={{ docked, setDocked, toolbar, setToolbar }}>
      {children}
    </ResellerHeaderDockContext.Provider>
  );
}

export function useResellerHeaderDock() {
  const ctx = useContext(ResellerHeaderDockContext);
  if (!ctx) {
    throw new Error("useResellerHeaderDock must be used within ResellerHeaderDockProvider");
  }
  return ctx;
}
