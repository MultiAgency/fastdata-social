import { useState } from "react";
import "./App.css";
import { Header } from "./Header/Header";
import { Upload } from "./Upload/Upload";
import { Social } from "./Social/Social";
import { useWallet } from "./providers/WalletProvider";

function App() {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<"upload" | "social">("upload");

  return (
    <div className="container-fluid">
      <Header />
      <div className="container mb-5">
        {isConnected ? (
          <div>
            {/* Tab Navigation */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`nav-link ${activeTab === "upload" ? "active" : ""}`}
                >
                  📁 File Upload
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => setActiveTab("social")}
                  className={`nav-link ${activeTab === "social" ? "active" : ""}`}
                >
                  👥 Social Graph
                </button>
              </li>
            </ul>

            {/* Tab Content */}
            {activeTab === "upload" ? (
              <Upload key="upload" />
            ) : (
              <Social key="social" />
            )}
          </div>
        ) : (
          <div className="alert alert-warning" role="alert">
            Please Sign In
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
