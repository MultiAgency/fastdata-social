import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ErrorBoundary } from "./ErrorBoundary";
import { WalletProvider } from "./providers/WalletProvider";
import { router } from "./router";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <ErrorBoundary>
    <WalletProvider>
      <RouterProvider router={router} />
    </WalletProvider>
  </ErrorBoundary>,
);
