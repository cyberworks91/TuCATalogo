import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Info, Monitor, Laptop } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredPWAInstallPrompt?: BeforeInstallPromptEvent;
  }
}

// Device & Browser Detection Helper
export type PlatformType = 'ios' | 'android-chrome' | 'android-firefox' | 'desktop-chrome-edge' | 'desktop-firefox' | 'desktop-safari' | 'other';

export const detectPlatform = (): { type: PlatformType; name: string } => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /android/.test(ua);
  const isFirefox = /firefox/.test(ua);
  const isChrome = /chrome|crios/.test(ua) && !/edg\//.test(ua);
  const isEdge = /edg\//.test(ua);
  const isSafari = /safari/.test(ua) && !isChrome && !isEdge;
  const isDesktop = !isIOS && !isAndroid;

  if (isIOS) {
    return { type: 'ios', name: 'iPhone / iPad (Safari / Chrome)' };
  }
  if (isAndroid) {
    if (isFirefox) return { type: 'android-firefox', name: 'Android (Firefox)' };
    return { type: 'android-chrome', name: 'Android (Chrome / Edge)' };
  }
  if (isDesktop) {
    if (isFirefox) return { type: 'desktop-firefox', name: 'PC / Mac (Firefox)' };
    if (isSafari) return { type: 'desktop-safari', name: 'Mac (Safari)' };
    return { type: 'desktop-chrome-edge', name: 'PC / Mac (Chrome / Edge)' };
  }
  return { type: 'other', name: 'Dispositivo Navegador' };
};

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => window.deferredPWAInstallPrompt || null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [platform, setPlatform] = useState<{ type: PlatformType; name: string }>({ type: 'other', name: '' });

  useEffect(() => {
    setPlatform(detectPlatform());

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
    platform,
    canInstall: !!(deferredPrompt || window.deferredPWAInstallPrompt),
    triggerInstall,
  };
};

export const PWAInstallNotice: React.FC<{
  autoHideDuration?: number; // ms, default 10000ms (10 segundos)
}> = ({ autoHideDuration = 10000 }) => {
  const { isInstalled, platform, canInstall, triggerInstall } = usePWAInstall();
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
    if (platform.type === 'ios' || platform.type === 'desktop-firefox') {
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

  const renderInstructions = () => {
    switch (platform.type) {
      case 'ios':
        return (
          <>
            <div className="font-semibold text-orange-400 flex items-center gap-1">
              <Share className="w-3.5 h-3.5" /> Pasos en iPhone / iPad (Safari):
            </div>
            <p>1. Toca el botón <span className="font-bold text-white"><Share className="w-3.5 h-3.5 inline" /> Compartir</span> abajo en Safari.</p>
            <p>2. Desplázate hacia abajo y elige <span className="font-bold text-white"><PlusSquare className="w-3.5 h-3.5 inline" /> Agregar a inicio</span>.</p>
            <p>3. Confirma tocando <span className="font-bold text-white">"Agregar"</span> en la esquina superior.</p>
          </>
        );

      case 'android-chrome':
        return (
          <>
            <div className="font-semibold text-orange-400 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" /> Pasos en Android (Chrome / Edge):
            </div>
            <p>1. Toca los <span className="font-bold text-white">3 puntos (⋮)</span> en la esquina superior derecha.</p>
            <p>2. Selecciona <span className="font-bold text-white">"Instalar aplicación"</span> o <span className="font-bold text-white">"Agregar a la pantalla principal"</span>.</p>
            <p className="text-[10px] text-gray-400 mt-1">* Nota: Si dice "Crear acceso directo", espera unos segundos a que cargue el sistema o recarga la página para que aparezca "Instalar aplicación".</p>
          </>
        );

      case 'android-firefox':
        return (
          <>
            <div className="font-semibold text-orange-400 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" /> Pasos en Android (Firefox):
            </div>
            <p>1. Toca el menú de <span className="font-bold text-white">3 puntos (⋮)</span> abajo o arriba.</p>
            <p>2. Toca en <span className="font-bold text-white">"Instalar"</span> o <span className="font-bold text-white">"Agregar a la pantalla de inicio"</span>.</p>
          </>
        );

      case 'desktop-chrome-edge':
        return (
          <>
            <div className="font-semibold text-orange-400 flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5" /> Pasos en PC / Mac (Chrome / Edge):
            </div>
            <p>1. Haz clic en el <span className="font-bold text-white">icono de pantalla con flecha (Instalar)</span> a la derecha en la barra de dirección (URL).</p>
            <p>2. O abre el menú <span className="font-bold text-white">3 puntos (⋮) → Guardar y compartir → Instalar TuCATalogo</span>.</p>
          </>
        );

      case 'desktop-safari':
        return (
          <>
            <div className="font-semibold text-orange-400 flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5" /> Pasos en macOS Safari:
            </div>
            <p>1. En el menú superior de Safari, haz clic en <span className="font-bold text-white">Archivo</span> o <span className="font-bold text-white">Compartir</span>.</p>
            <p>2. Elige <span className="font-bold text-white">"Agregar al Dock"</span>.</p>
          </>
        );

      case 'desktop-firefox':
        return (
          <>
            <div className="font-semibold text-orange-400 flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5" /> Navegador Firefox Desktop:
            </div>
            <p>Firefox en PC no admite instalación PWA nativa. Te recomendamos usar <span className="font-bold text-white">Google Chrome / Edge</span> en PC o abrir <span className="font-bold text-white">https://tucatalogo.lat</span> en tu celular.</p>
          </>
        );

      default:
        return (
          <>
            <div className="font-semibold text-orange-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Instrucciones de instalación:
            </div>
            <p>Abre el menú de tu navegador y selecciona <span className="font-bold text-white">"Instalar aplicación"</span> o <span className="font-bold text-white">"Agregar a la pantalla de inicio"</span>.</p>
          </>
        );
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
            <div className="mt-1 p-2.5 bg-gray-800/90 rounded-xl text-[11px] text-gray-200 border border-gray-700 space-y-1.5 animate-in fade-in duration-200">
              {renderInstructions()}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
