import { Outlet } from "@tanstack/react-router";
import { Header } from "./Header/Header";
import { useWallet } from "./providers/WalletProvider";

function App() {
  const { isInitializing } = useWallet();

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
        ) : (
          <div className="mt-8 animate-fade-up">
            <Outlet />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
