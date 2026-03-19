const CACHE_KILL_FLAG = "vetorpro-cache-kill-v1";

export async function clearLegacyCache() {
  if (typeof window === "undefined") return;

  const hasServiceWorkerSupport = "serviceWorker" in navigator;
  const hasCacheSupport = "caches" in window;

  let hadLegacyArtifacts = false;

  if (hasServiceWorkerSupport) {
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registrations.map(async (registration) => {
        hadLegacyArtifacts = true;
        await registration.unregister();
      })
    );
  }

  if (hasCacheSupport) {
    const cacheKeys = await caches.keys();

    await Promise.all(
      cacheKeys.map(async (key) => {
        hadLegacyArtifacts = true;
        await caches.delete(key);
      })
    );
  }

  if (hadLegacyArtifacts && !sessionStorage.getItem(CACHE_KILL_FLAG)) {
    sessionStorage.setItem(CACHE_KILL_FLAG, "true");
    window.location.reload();
  }
}
