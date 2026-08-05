"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { ProcessInboxResponse } from "@/lib/types";

type BriefContextValue = {
  data: ProcessInboxResponse | null;
  setData: (data: ProcessInboxResponse | null) => void;
};

const BriefContext = createContext<BriefContextValue | null>(null);

export function BriefProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProcessInboxResponse | null>(null);
  return (
    <BriefContext.Provider value={{ data, setData }}>
      {children}
    </BriefContext.Provider>
  );
}

export function useBrief(): BriefContextValue {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error("useBrief must be used within a BriefProvider");
  }
  return context;
}
