"use client";

import { usePrivy as usePrivyOriginal } from "@privy-io/react-auth";
import { usePrivyReady } from "@/components/Providers";

/**
 * Safe wrapper around usePrivy that handles cases where
 * Privy provider hasn't mounted yet (SSR / build time).
 *
 * This is NOT demo mode — it just prevents crashes during hydration.
 * Once mounted, it delegates entirely to the real Privy hook.
 */
export function usePrivySafe() {
  const isReady = usePrivyReady();

  if (!isReady) {
    // Privy provider not mounted yet (SSR or missing config)
    return {
      ready: false,
      authenticated: false,
      login: () => {},
      logout: async () => {},
      user: null,
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePrivyOriginal();
}
