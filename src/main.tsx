import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { WalletProvider } from "./providers/WalletProvider";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <WalletProvider>
    <App />
  </WalletProvider>
);
