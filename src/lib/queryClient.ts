import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      gcTime: 24 * 60 * 60_000, // 24 hours persistent in-memory cache
    },
    mutations: {
      retry: 0,
    },
  },
});
