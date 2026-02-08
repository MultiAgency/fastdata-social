import { createRootRoute, createRoute, createRouter, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import App from "./App";
import { Directory } from "./Directory/Directory";
import { Connections } from "./Profile/Connections";
import { ProfilePage } from "./Profile/ProfilePage";

const LazyGraphView = lazy(() =>
  import("./Social/GraphView").then((m) => ({ default: m.GraphView })),
);

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-up">
      <h1 className="text-4xl font-semibold tracking-tight mb-2">404</h1>
      <p className="text-sm text-muted-foreground font-mono mb-6">page not found</p>
      <Link to="/" className="text-sm font-mono text-primary hover:underline">
        back to directory &rarr;
      </Link>
    </div>
  ),
});

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

const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/graph/$accountId",
  component: () => {
    const { accountId } = graphRoute.useParams();
    return (
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <LazyGraphView accountId={accountId} />
      </Suspense>
    );
  },
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  graphRoute,
  profileRoute,
  profileAccountRoute,
  profileFollowersRoute,
  profileFollowingRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
