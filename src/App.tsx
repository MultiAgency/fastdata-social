import { Outlet } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "./Header/Header";
import { useWallet } from "./providers/WalletProvider";

function App() {
  const { isConnected, isInitializing } = useWallet();

  return (
    <div className="relative min-h-screen">
      <Header />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-up">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center animate-pulse-glow mb-4">
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 16 16"
                fill="none"
                className="text-primary animate-spin"
                style={{ animationDuration: "3s" }}
              >
                <path
                  d="M2 8L8 2L14 8L8 14Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-mono">initializing_</p>
          </div>
        ) : isConnected ? (
          <div className="mt-8 animate-fade-up">
            <Outlet />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 animate-pulse-glow">
              <svg
                aria-hidden="true"
                width="28"
                height="28"
                viewBox="0 0 16 16"
                fill="none"
                className="text-primary"
              >
                <path
                  d="M2 8L8 2L14 8L8 14Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M5 8L8 5L11 8L8 11Z" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Welcome to FastData</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">
              Connect your NEAR wallet to explore the social graph, upload files, and browse
              on-chain data.
            </p>
            <Alert variant="default" className="max-w-sm border-primary/30 bg-primary/5">
              <AlertDescription className="text-center">
                Click <span className="font-semibold text-primary">Sign In</span> above to connect
                your wallet
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
