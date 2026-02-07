import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
import { Directory } from "./Directory/Directory";
import { Playground } from "./Playground/Playground";
import { Connections } from "./Profile/Connections";
import { ProfileEditor } from "./Profile/ProfileEditor";
import { ProfilePage } from "./Profile/ProfilePage";
import { ExplorerView } from "./Social/Explorer/ExplorerView";
import { GraphView } from "./Social/GraphView";
import { Upload } from "./Upload/Upload";

const rootRoute = createRootRoute({
  component: App,
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

interface DirectorySearch {
  tag?: string;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Directory,
  validateSearch: (search: Record<string, unknown>): DirectorySearch => ({
    tag: typeof search.tag === "string" ? search.tag : undefined,
  }),
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: Upload,
});

const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/graph/$accountId",
  component: () => {
    const { accountId } = graphRoute.useParams();
    return <GraphView accountId={accountId} />;
  },
});

const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explorer",
  component: () => <RequireWallet>{(id) => <ExplorerView accountId={id} />}</RequireWallet>,
});

const profileEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/edit",
  component: () => <RequireWallet>{() => <ProfileEditor />}</RequireWallet>,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const profileAccountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$accountId",
  component: ProfilePage,
});

const profileFollowersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$accountId/followers",
  component: () => <Connections type="followers" />,
});

const profileFollowingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$accountId/following",
  component: () => <Connections type="following" />,
});

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playground",
  component: () => <RequireWallet>{(id) => <Playground accountId={id} />}</RequireWallet>,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  uploadRoute,
  graphRoute,
  explorerRoute,
  profileEditRoute,
  profileRoute,
  profileAccountRoute,
  profileFollowersRoute,
  profileFollowingRoute,
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
