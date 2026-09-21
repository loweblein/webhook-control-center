import {
  ArrowsClockwise,
  ChartLineUp,
  GearSix,
  Key,
  Moon,
  PlugsConnected,
  Queue,
  Pulse,
  Sun
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { api, session } from "../api.js";
import type { Workspace } from "../types.js";
import { useTheme } from "./ThemeProvider.js";

const navItems = [
  { to: "/overview", label: "Visão geral", icon: ChartLineUp },
  { to: "/events", label: "Eventos", icon: Pulse },
  { to: "/deliveries", label: "Entregas", icon: Queue },
  { to: "/endpoints", label: "Endpoints", icon: PlugsConnected },
  { to: "/api-keys", label: "API Keys", icon: Key },
  { to: "/settings", label: "Configurações", icon: GearSix }
];

export function AppShell() {
  const token = session.token;
  const { theme, toggleTheme } = useTheme();
  const workspaces = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api<Workspace[]>("/workspaces"),
    enabled: Boolean(token)
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const activeWorkspace = workspaces.data?.find((workspace) => workspace.id === session.workspaceId) ?? workspaces.data?.[0];

  if (workspaces.isError || (workspaces.data && workspaces.data.length === 0)) {
    session.token = null;
    session.workspaceId = null;
    return <Navigate to="/login" replace />;
  }

  if (workspaces.isLoading || !activeWorkspace) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f6f8fb] dark:bg-[#0b1020]">
        <div className="rounded-lg border border-line bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-soft dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
          Carregando workspace
        </div>
      </div>
    );
  }

  session.workspaceId = activeWorkspace.id;

  return (
    <div className="min-h-[100dvh] bg-[#f6f8fb] dark:bg-[#0b1020]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-white dark:border-dark-line dark:bg-[#0f1726] lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-line px-6 dark:border-dark-line">
          <div className="grid size-9 place-items-center rounded-lg bg-emerald-700 text-white">
            <ArrowsClockwise size={19} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Webhook Control Center</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{activeWorkspace?.name ?? "Carregando workspace"}</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive
                    ? "bg-slate-950 text-white dark:bg-emerald-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-white/92 px-5 py-4 backdrop-blur dark:border-dark-line dark:bg-[#0f1726]/92">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">Dashboard de produção</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">Webhook Control Center</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 dark:border-dark-line dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Claro" : "Escuro"}
              </button>
              <button
                className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 dark:border-dark-line dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
                onClick={() => {
                  session.token = null;
                  session.workspaceId = null;
                  window.location.href = "/login";
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
