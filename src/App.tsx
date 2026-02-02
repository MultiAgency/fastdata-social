import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "./Header/Header";
import { useWallet } from "./providers/WalletProvider";

const tabs = [
  { to: "/playground" as const, label: "Playground", icon: "▶" },
  { to: "/upload" as const, label: "Upload", icon: "↑" },
  { to: "/social" as const, label: "Social", icon: "◉" },
  { to: "/graph" as const, label: "Graph", icon: "⬡" },
  { to: "/explorer" as const, label: "Explorer", icon: "▤" },
];

function App() {
  const { isConnected, isInitializing } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
            <div
              role="tablist"
              className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/50 mb-6"
            >
              {tabs.map((tab) => {
                const active = pathname === tab.to;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    role="tab"
                    id={`tab-${tab.label.toLowerCase()}`}
                    aria-selected={active}
                    aria-controls="main-tabpanel"
                    className={`flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-lg glow-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="text-base leading-none">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
            <div
              role="tabpanel"
              id="main-tabpanel"
              aria-labelledby={`tab-${tabs.find((t) => t.to === pathname)?.label.toLowerCase() || "upload"}`}
            >
              <Outlet />
            </div>
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
