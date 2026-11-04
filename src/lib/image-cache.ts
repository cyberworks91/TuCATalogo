// High-Performance Local Cache for Carousel & Catalog Images
// Uses browser CacheStorage API + in-memory Blob Object URLs for 0ms instantaneous display

const CACHE_NAME = 'tucatalogo-images-v1';

// In-memory memory-map of Object URLs for instant 0ms access without disk I/O
const memoryBlobCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

/**
 * Returns a locally cached object URL if available, or fetches and caches it in background.
 */
export async function getCachedImageUrl(url: string | null | undefined): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 1. Check in-memory blob cache (instant 0ms synchronous lookup)
  if (memoryBlobCache.has(trimmed)) {
    return memoryBlobCache.get(trimmed)!;
  }

  // 2. Prevent duplicate concurrent fetches for the same image
  if (inFlightRequests.has(trimmed)) {
    return inFlightRequests.get(trimmed)!;
  }

  const fetchPromise = (async () => {
    // 3. Check browser CacheStorage API
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await window.caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(trimmed);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const blobUrl = URL.createObjectURL(blob);
          memoryBlobCache.set(trimmed, blobUrl);
          return blobUrl;
        }

        // 4. Fetch over network with CORS and store in CacheStorage
        const res = await fetch(trimmed, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache'
        });

        if (res.ok) {
          try {
            await cache.put(trimmed, res.clone());
          } catch {
            // Ignore quota or cache.put errors gracefully
          }
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          memoryBlobCache.set(trimmed, blobUrl);
          return blobUrl;
        }
      } catch {
        // Fallback gracefully on CORS or network error
      }
    }

    // Fallback: return the original optimized URL directly for normal <img> loading
    return trimmed;
  })();

  inFlightRequests.set(trimmed, fetchPromise);
  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlightRequests.delete(trimmed);
  }
}

/**
 * Preloads a batch of images (e.g. all upcoming carousel slides) into local cache
 */
export function preloadCachedImages(urls: (string | null | undefined)[]) {
  if (typeof window === 'undefined') return;
  const validUrls = urls.filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim()));
  
  // Background preloading without blocking the UI thread
  setTimeout(() => {
    validUrls.forEach(url => {
      getCachedImageUrl(url).catch(() => {});
    });
  }, 100);
}

/**
 * Clear image cache if needed
 */
export async function clearLocalImageCache() {
  memoryBlobCache.clear();
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      await window.caches.delete(CACHE_NAME);
    } catch {}
  }
}
