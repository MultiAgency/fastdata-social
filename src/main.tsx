import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import "./index.css";
import { WalletProvider } from "./providers/WalletProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { router } from "./router";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <ErrorBoundary>
    <WalletProvider>
      <RouterProvider router={router} />
    </WalletProvider>
  </ErrorBoundary>
);
