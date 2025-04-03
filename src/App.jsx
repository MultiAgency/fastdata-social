import "./App.css";
import { Header } from "./Header/Header.jsx";
import { useAccountId } from "./hooks/useAccountId.js";
import { Upload } from "./Upload/Upload.jsx";

function App() {
  const accountId = useAccountId();

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
