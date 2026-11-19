import { useEffect } from "react";

export default function useRefreshOnFocus(refresh) {
  useEffect(() => {
    let refreshing = false;
    const refreshWhenVisible = async () => {
      if (document.visibilityState === "hidden" || refreshing) return;

      refreshing = true;
      try {
        await refresh();
      } finally {
        refreshing = false;
      }
    };

    refreshWhenVisible();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);
}
