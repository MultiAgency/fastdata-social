import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { Constants } from "./hooks/constants.js";

import "@near-wallet-selector/modal-ui/styles.css";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMeteorWalletApp } from "@near-wallet-selector/meteor-wallet-app";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupSender } from "@near-wallet-selector/sender";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupNearMobileWallet } from "@near-wallet-selector/near-mobile-wallet";
import { setupWelldoneWallet } from "@near-wallet-selector/welldone-wallet";
import { WalletSelectorProvider } from "@near-wallet-selector/react-hook";

const walletSelectorConfig = {
  network: Constants.NETWORK,
  createAccessKeyFor: Constants.CONTRACT_ID,
  modules: [
    setupMeteorWallet(),
    setupMeteorWalletApp({ contractId: Constants.CONTRACT_ID }),
    setupHotWallet(),
    setupLedger(),
    setupSender(),
    setupHereWallet(),
    setupNearMobileWallet(),
    setupWelldoneWallet(),
    setupMyNearWallet(),
  ],
};

createRoot(document.getElementById("root")).render(
  <WalletSelectorProvider config={walletSelectorConfig}>
    <App />
  </WalletSelectorProvider>
);
