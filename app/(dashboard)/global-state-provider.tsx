"use client";

import { createContext, useContext } from "react";
import { useDashboardShellState } from "../use-dashboard-shell-state";

type ShellState = ReturnType<typeof useDashboardShellState>;

const GlobalStateContext = createContext<ShellState | null>(null);

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const state = useDashboardShellState();
  return (
    <GlobalStateContext.Provider value={state}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState(): ShellState {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
}
