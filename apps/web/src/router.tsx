import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./ui/AppShell.js";

const LoginPage = lazy(() => import("./views/LoginPage.js").then((module) => ({ default: module.LoginPage })));
const OverviewPage = lazy(() => import("./views/OverviewPage.js").then((module) => ({ default: module.OverviewPage })));
const EventsPage = lazy(() => import("./views/EventsPage.js").then((module) => ({ default: module.EventsPage })));
const DeliveriesPage = lazy(() => import("./views/DeliveriesPage.js").then((module) => ({ default: module.DeliveriesPage })));
const EndpointsPage = lazy(() => import("./views/EndpointsPage.js").then((module) => ({ default: module.EndpointsPage })));
const ApiKeysPage = lazy(() => import("./views/ApiKeysPage.js").then((module) => ({ default: module.ApiKeysPage })));
const SettingsPage = lazy(() => import("./views/SettingsPage.js").then((module) => ({ default: module.SettingsPage })));

function PageLoader() {
  return (
    <div className="grid min-h-[280px] place-items-center rounded-lg border border-line bg-white text-sm font-medium text-slate-500 shadow-soft dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
      Carregando
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: withSuspense(<LoginPage />) },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: withSuspense(<OverviewPage />) },
      { path: "events", element: withSuspense(<EventsPage />) },
      { path: "deliveries", element: withSuspense(<DeliveriesPage />) },
      { path: "endpoints", element: withSuspense(<EndpointsPage />) },
      { path: "api-keys", element: withSuspense(<ApiKeysPage />) },
      { path: "settings", element: withSuspense(<SettingsPage />) }
    ]
  }
]);
