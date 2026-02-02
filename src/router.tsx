import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import App from "./App";
import { Playground } from "./Playground/Playground";
import { ExplorerView } from "./Social/Explorer/ExplorerView";
import { GraphView } from "./Social/GraphView";
import { Social } from "./Social/Social";
import { Upload } from "./Upload/Upload";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/playground" });
  },
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: Upload,
});

const socialRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/social",
  component: Social,
});

const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/graph",
  component: () => <RequireWallet>{(id) => <GraphView accountId={id} />}</RequireWallet>,
});

const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explorer",
  component: () => <RequireWallet>{(id) => <ExplorerView accountId={id} />}</RequireWallet>,
});

// Wrapper that gates on wallet connection before rendering
import { useWallet } from "./providers/WalletProvider";

function RequireWallet({ children }: { children: (accountId: string) => React.ReactNode }) {
  const { accountId } = useWallet();
  if (!accountId) {
    return (
      <div className="flex justify-center py-20">
        <output className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent">
          <span className="sr-only">Loading account...</span>
        </output>
      </div>
    );
  }
  return <>{children(accountId)}</>;
}

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playground",
  component: () => <RequireWallet>{(id) => <Playground accountId={id} />}</RequireWallet>,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  uploadRoute,
  socialRoute,
  graphRoute,
  explorerRoute,
  playgroundRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
