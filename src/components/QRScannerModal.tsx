import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, ShoppingBag, Package, Camera, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Catalog, ProductType } from '../types';
import { formatPrice, roundPrice, getImageUrl } from '../lib/utils';
import { toast } from 'sonner';

interface QRScannerModalProps {
  catalog: Catalog;
  products: Product[];
  productTypes: ProductType[];
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  userLoggedIn: boolean;
  onNavigateLogin: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  catalog,
  products,
  productTypes,
  onClose,
  onAddToCart,
  userLoggedIn,
  onNavigateLogin
}) => {
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const isWholesaleActive = catalog.settings.sale_type_wholesale !== false;
  const isRetailActive = catalog.settings.sale_type_retail !== false;

  // Function to process a code (scanned or typed)
  const processCode = (code: string) => {
    let cleanCode = code.trim();
    if (!cleanCode || isProcessingRef.current) return;

    // If cleanCode is a URL, extract potential product code or ID without navigating
    if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
      try {
        const url = new URL(cleanCode);
        const paramCode = url.searchParams.get('code') || url.searchParams.get('id') || url.searchParams.get('product');
        if (paramCode) {
          cleanCode = paramCode;
        } else {
          const segments = url.pathname.split('/').filter(Boolean);
          if (segments.length > 0) {
            cleanCode = segments[segments.length - 1];
          }
        }
      } catch {
        // Keep cleanCode as is
      }
    }

    isProcessingRef.current = true;

    // Search for product by code or ID
    const foundProduct = products.find(p => 
      (p.code && p.code.trim().toLowerCase() === cleanCode.toLowerCase()) || 
      p.id === cleanCode
    );

    if (foundProduct) {
      // Pause html5Qrcode scanning while product modal is open
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        try {
          html5QrcodeRef.current.pause(true);
        } catch (e) {
          console.warn("Error pausing scanner:", e);
        }
      }
      setScannedProduct(foundProduct);
      setActivePhoto(0);
      toast.success(`Producto detectado: ${foundProduct.name}`);
    } else {
      toast.error(`No se encontró producto con el código: ${cleanCode}`);
      // Cooldown before allowing same code scan again
      setLastScannedCode(code);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        setLastScannedCode(null);
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  const handleClose = async () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

    // Stop video tracks directly to immediately kill the camera indicator
    try {
      const container = document.getElementById("qr-reader-canvas");
      if (container) {
        const videos = container.getElementsByTagName("video");
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
          }
        }
      }
    } catch (err) {
      console.warn("Direct video stream stop warning:", err);
    }

    if (html5QrcodeRef.current) {
      try {
        try {
          html5QrcodeRef.current.resume();
        } catch {}
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (err) {
        console.warn("Html5Qrcode stop warning:", err);
      } finally {
        try {
          html5QrcodeRef.current.clear();
        } catch {}
      }
    }

    onClose();
  };

  useEffect(() => {
    const scannerId = "qr-reader-canvas";
    const html5Qrcode = new Html5Qrcode(scannerId);
    html5QrcodeRef.current = html5Qrcode;

    const startCamera = async () => {
      try {
        setCameraError(null);
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isProcessingRef.current && decodedText !== lastScannedCode) {
              processCode(decodedText);
            }
          },
          () => {
            // Ignore scan attempt errors (normal frame scan ticks)
          }
        );
        setIsScanning(true);
      } catch (err: any) {
        console.warn("Camera access failed or unavailable:", err);
        setCameraError("No se pudo acceder a la cámara. Por favor verifica los permisos de la cámara en tu navegador.");
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

      try {
        const container = document.getElementById("qr-reader-canvas");
        if (container) {
          const videos = container.getElementsByTagName("video");
          for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
              video.srcObject = null;
            }
          }
        }
      } catch {}

      if (html5QrcodeRef.current) {
        try {
          try {
            html5QrcodeRef.current.resume();
          } catch {}
          if (html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().catch(err => console.warn("Error stopping scanner:", err));
          }
        } catch {}
        try {
          html5QrcodeRef.current.clear();
        } catch {}
      }
    };
  }, []);

  const handleResumeScan = () => {
    setScannedProduct(null);
    isProcessingRef.current = false;
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          html5QrcodeRef.current.resume();
        }
      } catch (e) {
        console.warn("Resume scan error:", e);
      }
    }
  };

  const handleAddAndContinue = (product: Product) => {
    if (!userLoggedIn) {
      onNavigateLogin();
      handleClose();
      return;
    }
    onAddToCart(product);
    handleResumeScan();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-orange-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Escáner QR / Código de Barras</h2>
              <p className="text-xs text-orange-100 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Detección continua activada
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
            title="Cerrar escaner"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner View Area */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-gray-900 text-white relative">
          
          <div className="w-full relative flex flex-col items-center">
            {/* HTML5 QR Code element target */}
            <div 
              id="qr-reader-canvas" 
              className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden border-2 border-orange-500 bg-black shadow-inner relative"
            />

            {cameraError && (
              <div className="p-4 bg-red-900/80 border border-red-500/50 rounded-2xl text-center text-xs text-red-200 mt-4 max-w-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{cameraError}</span>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              Apunta la cámara al código QR o de barras del producto
            </p>
          </div>
        </div>

        {/* Detected Product Modal Overlay */}
        <AnimatePresence>
          {scannedProduct && (
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-50 bg-white flex flex-col overflow-y-auto"
            >
              {/* Top Banner */}
              <div className="p-4 bg-green-500 text-white flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Check className="w-5 h-5 bg-white text-green-600 rounded-full p-0.5" />
                  <span>¡Producto Detectado!</span>
                </div>
                <button 
                  onClick={handleResumeScan}
                  className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white flex items-center gap-1 text-xs font-bold"
                >
                  <span>Volver al escáner</span>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-6 flex-1 space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border shrink-0">
                    {scannedProduct.photos?.[0] ? (
                      <img 
                        src={getImageUrl(scannedProduct.photos[0], 'products')} 
                        alt={scannedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {scannedProduct.code && (
                      <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black uppercase rounded-md mb-1">
                        Código: {scannedProduct.code}
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 leading-snug">{scannedProduct.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{scannedProduct.description}</p>
                  </div>
                </div>

                {/* Prices depending on catalog active sale types */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  {isWholesaleActive && (
                    <div className="bg-white p-3 rounded-xl border border-orange-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Precio Mayorista (mín {scannedProduct.min_wholesale_qty})</p>
                      <p className="text-lg font-black text-orange-600">
                        {formatPrice(scannedProduct.custom_wholesale_price_mn || roundPrice((scannedProduct.ref_price || 0) * (catalog.exchange_rate || 1)))}
                      </p>
                    </div>
                  )}

                  {isRetailActive && (
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Precio Minorista</p>
                      <p className="text-lg font-black text-gray-900">
                        {formatPrice(scannedProduct.classification === 'sale' && scannedProduct.sale_price ? scannedProduct.sale_price : scannedProduct.cup_price)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  {scannedProduct.classification !== 'out' ? (
                    <button 
                      onClick={() => handleAddAndContinue(scannedProduct)}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 text-base"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      <span>Añadir a la Bolsa</span>
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-gray-200 text-gray-500 font-bold text-center rounded-2xl text-sm">
                      Producto Agotado
                    </div>
                  )}

                  <button 
                    onClick={handleResumeScan}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Seguir Escaneando</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
