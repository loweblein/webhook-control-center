import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./ui/AppShell.js";
import { ApiKeysPage } from "./views/ApiKeysPage.js";
import { DeliveriesPage } from "./views/DeliveriesPage.js";
import { EndpointsPage } from "./views/EndpointsPage.js";
import { EventsPage } from "./views/EventsPage.js";
import { LoginPage } from "./views/LoginPage.js";
import { OverviewPage } from "./views/OverviewPage.js";
import { SettingsPage } from "./views/SettingsPage.js";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "events", element: <EventsPage /> },
      { path: "deliveries", element: <DeliveriesPage /> },
      { path: "endpoints", element: <EndpointsPage /> },
      { path: "api-keys", element: <ApiKeysPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);
