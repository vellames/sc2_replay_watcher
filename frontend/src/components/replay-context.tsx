"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { ReplayData } from "@/lib/types";

type ReplayContextValue = {
  replay: ReplayData | null;
  setReplay: (replay: ReplayData | null) => void;
};

const ReplayContext = createContext<ReplayContextValue | null>(null);

export function ReplayProvider({ children }: { children: React.ReactNode }) {
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const value = useMemo(() => ({ replay, setReplay }), [replay]);

  return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>;
}

export function useReplay() {
  const context = useContext(ReplayContext);
  if (!context) throw new Error("useReplay must be used inside ReplayProvider");
  return context;
}
