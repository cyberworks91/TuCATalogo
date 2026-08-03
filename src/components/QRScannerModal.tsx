import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, ShoppingBag, Package, Camera, RefreshCw, Check, AlertCircle, ChevronLeft, ChevronRight, Box, Minus, Plus, Coins, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Catalog, ProductType } from '../types';
import { formatPrice, roundPrice, getImageUrl, cn } from '../lib/utils';
import { toast } from 'sonner';

interface QRScannerModalProps {
  catalog: Catalog;
  products: Product[];
  productTypes: ProductType[];
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number, payCurrency?: 'MN' | 'REF') => void;
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
  
  // Scanned Product Detail state
  const [activePhoto, setActivePhoto] = useState(0);
  const [qtyMode, setQtyMode] = useState<'boxes' | 'units'>('units');
  const [selectedQty, setSelectedQty] = useState(1);
  const [payCurrency, setPayCurrency] = useState<'MN' | 'REF'>('MN'); // Always MN selected by default

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Function to process a code (scanned or typed)
  const processCode = (code: string) => {
    let cleanCode = code.trim();
    if (!cleanCode || isProcessingRef.current) return;

    // If cleanCode is a URL, extract potential product code or ID
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
      setQtyMode('units');
      setSelectedQty(foundProduct.min_wholesale_qty || 1);
      setPayCurrency('MN'); // Always default to MN
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

    // Stop video tracks directly
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
          () => {}
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
    setPayCurrency('MN');
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

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[220] p-4"
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
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white cursor-pointer"
            title="Cerrar escáner"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner View Area */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-gray-900 text-white relative">
          <div className="w-full relative flex flex-col items-center">
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

        {/* Detected Product Modal Overlay with Full Catalog Details & Payment Currency Selector */}
        <AnimatePresence>
          {scannedProduct && (() => {
            const minQty = scannedProduct.min_wholesale_qty || 1;
            const boxUnits = scannedProduct.units_per_box && scannedProduct.units_per_box > 0 ? scannedProduct.units_per_box : minQty;
            const currentBoxes = Math.max(1, Math.floor(selectedQty / boxUnits));

            const effectiveRate = (catalog?.exchange_rate || 1) + (catalog?.settings?.exchange_rate_margin || 0);
            const wholesalePriceMn = scannedProduct.custom_wholesale_price_mn || roundPrice((scannedProduct.ref_price || 0) * effectiveRate);
            const saleWholesalePriceMn = scannedProduct.classification === 'sale' && scannedProduct.sale_wholesale_price_ref 
              ? roundPrice(scannedProduct.sale_wholesale_price_ref * effectiveRate) 
              : null;
            const currentPriceMn = saleWholesalePriceMn || wholesalePriceMn;

            const prodRefPrice = scannedProduct.classification === 'sale' && scannedProduct.sale_wholesale_price_ref 
              ? scannedProduct.sale_wholesale_price_ref 
              : (scannedProduct.ref_price || 0);

            let currentPriceRef = prodRefPrice;
            if (currentPriceRef <= 0 && currentPriceMn > 0 && effectiveRate > 0) {
              currentPriceRef = currentPriceMn / effectiveRate;
            }

            const activeType = productTypes.find(t => t.id === scannedProduct.type_id);
            const cleanDescription = scannedProduct.description?.replace(/\[box:\d+\]/gi, '').replace(/\[invoice_name:.*?\]/gi, '').trim();

            const totalMn = currentPriceMn * selectedQty;
            const totalRef = currentPriceRef * selectedQty;

            return (
              <motion.div 
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-50 bg-white flex flex-col overflow-y-auto"
              >
                {/* Top Banner */}
                <div className="p-4 bg-green-500 text-white flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-10">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Check className="w-5 h-5 bg-white text-green-600 rounded-full p-0.5" />
                    <span>¡Producto Detectado!</span>
                  </div>
                  <button 
                    onClick={handleResumeScan}
                    className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white flex items-center gap-1 text-xs font-bold cursor-pointer"
                  >
                    <span>Volver al escáner</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Product Information */}
                <div className="p-6 flex-1 space-y-6">
                  
                  {/* Photo Gallery & Image Carousel */}
                  <div className="relative w-full h-56 sm:h-64 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 group shrink-0">
                    {scannedProduct.photos && scannedProduct.photos.length > 0 ? (
                      <img 
                        src={getImageUrl(scannedProduct.photos[activePhoto], 'products')} 
                        alt={scannedProduct.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-16 h-16" />
                      </div>
                    )}

                    {scannedProduct.photos && scannedProduct.photos.length > 1 && (
                      <>
                        <button 
                          type="button"
                          onClick={() => setActivePhoto(prev => (prev > 0 ? prev - 1 : scannedProduct.photos.length - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full transition-colors shadow-md cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-800" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setActivePhoto(prev => (prev < scannedProduct.photos.length - 1 ? prev + 1 : 0))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full transition-colors shadow-md cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-800" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {scannedProduct.photos.map((_, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "h-2 rounded-full transition-all",
                                i === activePhoto ? "bg-orange-600 w-5" : "bg-gray-300 w-2"
                              )} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Badges: Classification, Category, Code */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      scannedProduct.classification === 'new' ? "bg-green-100 text-green-700" :
                      scannedProduct.classification === 'sale' ? "bg-red-100 text-red-700" :
                      scannedProduct.classification === 'out' ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {scannedProduct.classification === 'new' ? 'Nuevo' : 
                       scannedProduct.classification === 'sale' ? 'En Oferta' : 
                       scannedProduct.classification === 'out' ? 'Agotado' : 'Normal'}
                    </span>

                    {activeType && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700 flex items-center gap-1">
                        <span>{activeType.emoji}</span>
                        <span>{activeType.name}</span>
                      </span>
                    )}

                    {scannedProduct.code && (
                      <span className="text-xs font-black text-gray-600 uppercase tracking-wider bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                        Código: {scannedProduct.code}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">{scannedProduct.name}</h3>
                    {cleanDescription && (
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-2">{cleanDescription}</p>
                    )}
                  </div>

                  {/* Catalog Prices Cards */}
                  {((catalog?.settings?.sale_type_wholesale !== false) || (catalog?.settings?.sale_type_retail !== false)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {catalog?.settings?.sale_type_wholesale !== false && (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Precio Mayorista (mín {minQty})</p>
                          {saleWholesalePriceMn ? (
                            <div className="flex flex-col">
                              <span className="text-xs line-through text-gray-400">{formatPrice(wholesalePriceMn)}</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-orange-600">{formatPrice(saleWholesalePriceMn)}</span>
                                <span className="text-[10px] text-gray-400 font-bold">{prodRefPrice.toFixed(2)} REF</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              <p className="text-xl font-black text-orange-600">{formatPrice(wholesalePriceMn)}</p>
                              <span className="text-[10px] text-gray-400 font-bold">{prodRefPrice.toFixed(2)} REF</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-gray-400">Total caja: {formatPrice(currentPriceMn * minQty)}</p>
                            <span className="text-[9px] text-gray-400 font-bold">({(prodRefPrice * minQty).toFixed(2)} REF)</span>
                          </div>
                        </div>
                      )}

                      {catalog?.settings?.sale_type_retail !== false && (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Precio Minorista</p>
                          {scannedProduct.classification === 'sale' && scannedProduct.sale_price ? (
                            <div className="flex flex-col">
                              <span className="text-xs line-through text-gray-400">{formatPrice(scannedProduct.cup_price)}</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-red-500">{formatPrice(scannedProduct.sale_price)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              <p className="text-xl font-black text-gray-900">{formatPrice(scannedProduct.cup_price)}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quantity Controls */}
                  {scannedProduct.classification !== 'out' && (
                    <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Cantidad a encargar</span>
                        <span className="text-xs font-bold text-orange-600">
                          Subtotal: {payCurrency === 'MN' ? formatPrice(totalMn) : `${totalRef.toFixed(2)} REF`}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-orange-200 shadow-sm">
                        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setQtyMode('units');
                              setSelectedQty(minQty);
                            }}
                            className={cn(
                              "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer",
                              qtyMode === 'units'
                                ? "bg-orange-600 text-white font-bold shadow-sm"
                                : "text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-200/60"
                            )}
                          >
                            <Box className="w-4 h-4" />
                            <span>Unidades</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQtyMode('boxes');
                              setSelectedQty(boxUnits);
                            }}
                            className={cn(
                              "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer",
                              qtyMode === 'boxes'
                                ? "bg-orange-600 text-white font-bold shadow-sm"
                                : "text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-200/60"
                            )}
                          >
                            <Package className="w-4 h-4" />
                            <span>Cajas</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <button
                            type="button"
                            onClick={() => {
                              if (qtyMode === 'boxes') {
                                const boxes = Math.max(1, Math.floor(selectedQty / boxUnits) - 1);
                                setSelectedQty(boxes * boxUnits);
                              } else {
                                setSelectedQty(prev => Math.max(minQty, prev - 1));
                              }
                            }}
                            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 shrink-0 cursor-pointer"
                            title={qtyMode === 'boxes' ? 'Quitar 1 caja' : 'Quitar 1 unidad'}
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <div className="flex flex-col items-center min-w-[4.5rem]">
                            {qtyMode === 'boxes' ? (
                              <>
                                <span className="text-sm font-black text-orange-600">
                                  {currentBoxes} {currentBoxes === 1 ? 'caja' : 'cajas'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-semibold">({selectedQty} un.)</span>
                              </>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={minQty}
                                  value={selectedQty}
                                  onChange={(e) => setSelectedQty(Math.max(minQty, parseInt(e.target.value) || minQty))}
                                  className="w-16 text-center font-black text-sm bg-gray-50 border rounded-lg py-1 outline-none focus:ring-1 focus:ring-orange-500"
                                />
                                <span className="text-xs font-bold text-gray-500">un.</span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (qtyMode === 'boxes') {
                                const boxes = Math.floor(selectedQty / boxUnits) + 1;
                                setSelectedQty(boxes * boxUnits);
                              } else {
                                setSelectedQty(prev => prev + 1);
                              }
                            }}
                            className="w-9 h-9 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 shrink-0 cursor-pointer"
                            title={qtyMode === 'boxes' ? 'Añadir 1 caja' : 'Añadir 1 unidad'}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Moneda de Pago Selector (MN vs REF) - ALWAYS MN SELECTED BY DEFAULT */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Moneda para el pago del producto:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPayCurrency('MN')}
                        className={cn(
                          "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center",
                          payCurrency === 'MN'
                            ? "bg-orange-50 border-2 border-orange-500 text-orange-900 shadow-sm"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-black text-sm">
                          <Coins className="w-4 h-4 text-orange-600" />
                          <span>MN (CUP)</span>
                        </div>
                        <span className="text-[11px] font-bold text-orange-700">
                          {formatPrice(totalMn)}
                        </span>
                        <span className="text-[9px] text-gray-500 font-medium">(Por defecto)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPayCurrency('REF')}
                        className={cn(
                          "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center",
                          payCurrency === 'REF'
                            ? "bg-orange-50 border-2 border-orange-500 text-orange-900 shadow-sm"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-black text-sm">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span>REF (USD)</span>
                        </div>
                        <span className="text-[11px] font-bold text-green-700">
                          {totalRef.toFixed(2)} REF
                        </span>
                        <span className="text-[9px] text-gray-500 font-medium">Pago en divisas</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    {scannedProduct.classification !== 'out' ? (
                      <button 
                        type="button"
                        onClick={() => {
                          if (!userLoggedIn) {
                            onNavigateLogin();
                            handleClose();
                            return;
                          }
                          onAddToCart(scannedProduct, selectedQty, payCurrency);
                          toast.success(`Añadido: ${scannedProduct.name} (${selectedQty} un. en ${payCurrency})`);
                          handleResumeScan();
                        }}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
                      >
                        <ShoppingBag className="w-5 h-5" />
                        <span>
                          Añadir al Pedido ({payCurrency === 'MN' ? formatPrice(totalMn) : `${totalRef.toFixed(2)} REF`})
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-gray-200 text-gray-500 font-bold text-center rounded-2xl text-sm">
                        Producto Agotado
                      </div>
                    )}

                    <button 
                      type="button"
                      onClick={handleResumeScan}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Seguir Escaneando</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
