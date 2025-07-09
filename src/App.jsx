import "./App.css";
import { Header } from "./Header/Header.jsx";
import { Upload } from "./Upload/Upload.jsx";
import { useWalletSelector } from "@near-wallet-selector/react-hook";

function App() {
  const { signedAccountId: accountId } = useWalletSelector();

  return (
    <div className="container-fluid">
      <Header accountId={accountId} />
      <div className="container mb-5">
        {accountId ? (
          <Upload key="upload" />
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
