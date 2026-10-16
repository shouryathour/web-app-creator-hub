import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Load a page's code as soon as the pointer hovers its link, so clicks open instantly.
    defaultPreload: "intent",
    // Swap to the next page's shell quickly so a click never leaves the old page sitting there.
    defaultPendingMs: 50,
    defaultPendingMinMs: 0,
  });

  return router;
};
