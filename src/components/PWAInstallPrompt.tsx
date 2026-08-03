import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Info } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredPWAInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => window.deferredPWAInstallPrompt || null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    const checkIsInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          window.matchMedia('(display-mode: fullscreen)').matches ||
                          (navigator as any).standalone === true ||
                          document.referrer.includes('android-app://') ||
                          localStorage.getItem('pwa_installed') === 'true';
      
      setIsInstalled(!!isStandalone);
    };

    checkIsInstalled();

    if (window.deferredPWAInstallPrompt) {
      setDeferredPrompt(window.deferredPWAInstallPrompt);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(iosDevice);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        localStorage.setItem('pwa_installed', 'true');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('pwa_installed', 'true');
      setDeferredPrompt(null);
      window.deferredPWAInstallPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || window.deferredPWAInstallPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('pwa_installed', 'true');
        }
        setDeferredPrompt(null);
        window.deferredPWAInstallPrompt = undefined;
        return true;
      } catch (err) {
        console.warn('Installation prompt error:', err);
      }
    }
    return false;
  };

  return {
    isInstalled,
    isIOS,
    canInstall: !!(deferredPrompt || window.deferredPWAInstallPrompt),
    triggerInstall,
  };
};

export const PWAInstallNotice: React.FC<{
  autoHideDuration?: number; // ms, default 10000ms (10 segundos)
}> = ({ autoHideDuration = 10000 }) => {
  const { isInstalled, isIOS, canInstall, triggerInstall } = usePWAInstall();
  const [visible, setVisible] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [progressWidth, setProgressWidth] = useState(100);

  useEffect(() => {
    if (isInstalled) return;

    const animFrame = requestAnimationFrame(() => {
      setProgressWidth(0);
    });

    const timer = setTimeout(() => {
      setVisible(false);
    }, autoHideDuration);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(timer);
    };
  }, [isInstalled, autoHideDuration]);

  if (isInstalled || !visible) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowInstructions(prev => !prev);
      return;
    }

    const installed = await triggerInstall();
    if (installed) {
      setVisible(false);
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      <style>{`
        @keyframes marqueeText {
          0% { transform: translateX(0%); }
          15% { transform: translateX(0%); }
          85% { transform: translateX(-40%); }
          100% { transform: translateX(0%); }
        }
        .animate-scroll-text {
          display: inline-block;
          white-space: nowrap;
          animation: marqueeText 8s ease-in-out infinite;
        }
      `}</style>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-gray-900/95 backdrop-blur-md text-white border border-gray-700/60 shadow-2xl rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden">
          {/* Animated timer progress bar at top */}
          <div
            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-t-2xl"
            style={{
              width: `${progressWidth}%`,
              transition: `width ${autoHideDuration}ms linear`
            }}
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-1.5 bg-orange-600/30 text-orange-400 rounded-xl shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-xs font-bold text-gray-100 truncate">
                  Instala TuCatalogo!
                </p>
                <div className="overflow-hidden w-full">
                  <span className="text-[11px] text-orange-300 animate-scroll-text font-medium">
                    Instálalo en tu dispositivo de manera directa
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar
              </button>
              <button
                onClick={() => setVisible(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showInstructions && (
            <div className="mt-1 p-2.5 bg-gray-800/90 rounded-xl text-[11px] text-gray-200 border border-gray-700 space-y-1">
              {isIOS ? (
                <>
                  <div className="font-semibold text-orange-400 flex items-center gap-1">
                    <Share className="w-3.5 h-3.5" /> En iPhone / iPad:
                  </div>
                  <p>1. Toca <span className="font-bold text-white"><Share className="w-3 h-3 inline" /> Compartir</span> en la barra de Safari.</p>
                  <p>2. Selecciona <span className="font-bold text-white"><PlusSquare className="w-3 h-3 inline" /> Agregar a la pantalla de inicio</span>.</p>
                </>
              ) : (
                <>
                  <div className="font-semibold text-orange-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Instrucciones de instalación:
                  </div>
                  <p>Toca los <span className="font-bold text-white">3 puntos (menú)</span> de tu navegador y selecciona <span className="font-bold text-white">"Instalar aplicación"</span> o <span className="font-bold text-white">"Agregar a la pantalla principal"</span>.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
