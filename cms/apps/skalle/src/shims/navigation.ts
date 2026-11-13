import { useSyncExternalStore } from "react";
import { subscribe, usePathname } from "@/lib/router";

export { usePathname };

/** Same use as next/navigation: the query string of the address, as it is now. */
export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return new URLSearchParams(search);
}
