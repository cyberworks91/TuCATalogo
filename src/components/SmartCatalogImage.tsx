import React, { useState, useEffect, useRef, memo } from 'react';
import { Package } from 'lucide-react';
import { cn } from '../lib/utils';

// Global cache for images loaded during the session to avoid re-flashing
const loadedImagesCache = new Set<string>();

interface SmartCatalogImageProps {
  src: string;
  alt: string;
  index: number;
  className?: string;
  containerClassName?: string;
}

/**
 * SmartCatalogImage
 * - Priority 1 (High): Immediate render for viewport-visible products + fast-scroll stops
 * - Priority 2 (Low/Buffer): Predictive preloading for 10-15 products ahead and behind (750px buffer)
 * - Zero network waste: Images outside the buffer are never fetched until scrolled near
 * - Instant session cache: Previously viewed images load with 0ms delay
 */
export const SmartCatalogImage = memo(({
  src,
  alt,
  index,
  className,
  containerClassName
}: SmartCatalogImageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initial top products (0-9) start with high priority immediately
  const isInitialEager = index < 10;
  const isAlreadyCached = src ? loadedImagesCache.has(src) : false;

  const [shouldLoad, setShouldLoad] = useState<boolean>(isInitialEager || isAlreadyCached);
  const [isInViewport, setIsInViewport] = useState<boolean>(isInitialEager);
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyCached);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!src) return;
    if (isAlreadyCached) {
      setShouldLoad(true);
      setIsLoaded(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Buffer Observer (Priority 2): Preloads 10-15 products ahead and behind (~750px margin)
    const bufferObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setShouldLoad(true);
          bufferObserver.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '750px 0px 750px 0px',
        threshold: 0.01,
      }
    );

    // Viewport Observer (Priority 1): Detects direct on-screen presence
    const viewportObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInViewport(true);
          setShouldLoad(true);
        } else {
          setIsInViewport(false);
        }
      },
      {
        root: null,
        rootMargin: '50px 0px 50px 0px',
        threshold: 0.05,
      }
    );

    bufferObserver.observe(container);
    viewportObserver.observe(container);

    return () => {
      bufferObserver.disconnect();
      viewportObserver.disconnect();
    };
  }, [src, isAlreadyCached]);

  if (!src || hasError) {
    return (
      <div 
        ref={containerRef}
        className={cn("w-full h-full bg-gray-100 flex items-center justify-center", containerClassName)}
      >
        <Package className="w-6 h-6 text-gray-300" />
      </div>
    );
  }

  // Priority 1: On screen -> high
  // Priority 2: In buffer area -> low
  const priority = isInViewport || isInitialEager ? 'high' : 'low';

  return (
    <div 
      ref={containerRef} 
      className={cn("relative w-full h-full overflow-hidden bg-gray-100", containerClassName)}
    >
      {/* Smooth skeleton placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse flex items-center justify-center">
          <Package className="w-5 h-5 text-gray-300/60" />
        </div>
      )}

      {/* Image element active only when within buffer or viewport */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          loading={isInitialEager ? 'eager' : 'lazy'}
          decoding="async"
          // @ts-ignore
          fetchPriority={priority}
          onLoad={() => {
            setIsLoaded(true);
            if (src) loadedImagesCache.add(src);
          }}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}
    </div>
  );
});

SmartCatalogImage.displayName = 'SmartCatalogImage';
