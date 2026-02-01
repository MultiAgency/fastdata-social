import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import App from "./App";
import { Upload } from "./Upload/Upload";
import { Social } from "./Social/Social";
import { GraphView } from "./Social/GraphView";
import { ExplorerView } from "./Social/Explorer/ExplorerView";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/upload" });
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
  component: function GraphPage() {
    // Imported lazily via the route; accountId gating is in App.tsx wrapper
    return <GraphRouteWrapper />;
  },
});

const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explorer",
  component: function ExplorerPage() {
    return <ExplorerRouteWrapper />;
  },
});

// Wrapper components that access wallet context at render time
// (can't use hooks in route config directly)
import { useWallet } from "./providers/WalletProvider";

function GraphRouteWrapper() {
  const { accountId } = useWallet();
  if (!accountId) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status">
          <span className="sr-only">Loading account...</span>
        </div>
      </div>
    );
  }
  return <GraphView accountId={accountId} />;
}

function ExplorerRouteWrapper() {
  const { accountId } = useWallet();
  if (!accountId) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status">
          <span className="sr-only">Loading account...</span>
        </div>
      </div>
    );
  }
  return <ExplorerView accountId={accountId} />;
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  uploadRoute,
  socialRoute,
  graphRoute,
  explorerRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
