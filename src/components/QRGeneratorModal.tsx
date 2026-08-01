import React, { useState, useMemo } from 'react';
import { X, Search, QrCode, Printer, CheckSquare, Square, Package, CheckCircle2, XCircle, Plus, Minus, Check, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { Product } from '../types';
import { dbService } from '../lib/supabase-service';

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductsUpdated?: () => void;
  catalogName?: string;
}

export const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductsUpdated,
  catalogName = 'Catalogo'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Status filter
      if (statusFilter === 'active' && (p.is_active === false || p.classification === 'out')) return false;
      if (statusFilter === 'inactive' && (p.is_active !== false && p.classification !== 'out')) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(term);
      const matchCode = p.code ? p.code.toLowerCase().includes(term) : false;
      const matchInvoice = p.invoice_name ? p.invoice_name.toLowerCase().includes(term) : false;
      return matchName || matchCode || matchInvoice;
    });
  }, [products, statusFilter, searchTerm]);

  // Calculate total QRs to generate
  const totalQRsToGenerate = useMemo(() => {
    let total = 0;
    selectedProductIds.forEach(id => {
      total += (quantities[id] || 1);
    });
    return total;
  }, [selectedProductIds, quantities]);

  if (!isOpen) return null;

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      const newSet = new Set<string>();
      filteredProducts.forEach(p => newSet.add(p.id));
      setSelectedProductIds(newSet);
    }
  };

  const toggleSelectProduct = (id: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedProductIds(next);
  };

  const setProductQty = (id: string, qty: number) => {
    const validQty = Math.max(1, Math.min(100, qty));
    setQuantities(prev => ({ ...prev, [id]: validQty }));
  };

  // Helper to generate random code if product lacks code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PRD-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGeneratePDF = async () => {
    if (selectedProductIds.size === 0) {
      toast.error('Por favor selecciona al menos un producto');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
      const updatedProductsList: Product[] = [];
      let missingCodeCount = 0;

      // 1. Ensure all selected products have a code
      for (const p of selectedProducts) {
        if (!p.code || !p.code.trim()) {
          const newCode = generateRandomCode();
          missingCodeCount++;
          await dbService.updateProduct(p.id, { code: newCode });
          updatedProductsList.push({ ...p, code: newCode });
        } else {
          updatedProductsList.push(p);
        }
      }

      if (missingCodeCount > 0) {
        toast.info(`Se asignó un código automático a ${missingCodeCount} producto(s) sin código.`);
        if (onProductsUpdated) {
          onProductsUpdated();
        }
      }

      // 2. Prepare QR items list according to quantity requested
      const qrList: { code: string; name: string }[] = [];
      updatedProductsList.forEach(p => {
        const count = quantities[p.id] || 1;
        for (let i = 0; i < count; i++) {
          qrList.push({
            code: p.code!,
            name: p.name
          });
        }
      });

      // 3. Generate PDF grid using jsPDF (6 per row, compact tight frames)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 6;
      const marginY = 8;

      const cols = 6; // 6 columns per row
      const cellWidth = (pageWidth - marginX * 2) / cols; // ~33mm
      const cellHeight = 35; // ~35mm compact height
      const rows = Math.floor((pageHeight - marginY * 2) / cellHeight); // 8 rows per page = 48 stickers per page

      let currentIndex = 0;

      for (let i = 0; i < qrList.length; i++) {
        const item = qrList[i];
        if (currentIndex > 0 && currentIndex % (cols * rows) === 0) {
          doc.addPage();
        }

        const pageIndex = currentIndex % (cols * rows);
        const col = pageIndex % cols;
        const row = Math.floor(pageIndex / cols);

        const x = marginX + col * cellWidth;
        const y = marginY + row * cellHeight;

        // Draw light grid border / sticker boundary (tight frame)
        doc.setDrawColor(210, 210, 215);
        doc.setLineWidth(0.2);
        doc.roundedRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2, 2, 2);

        // Generate QR Code Data URL
        const qrDataUrl = await QRCode.toDataURL(item.code, {
          margin: 1,
          width: 150,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        // Add QR Image to PDF (Size: 20mm x 20mm)
        const qrSize = 20; // 20mm x 20mm
        const qrX = x + (cellWidth - qrSize) / 2;
        const qrY = y + 2.5;
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // Text below QR Code
        doc.setTextColor(30, 30, 30);

        // Code text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        const codeText = item.code;
        doc.text(codeText, x + cellWidth / 2, qrY + qrSize + 2.8, { align: 'center' });

        // Product Name (Truncate if too long)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        const maxTextWidth = cellWidth - 4;
        const truncatedName = doc.splitTextToSize(item.name, maxTextWidth);
        const nameToShow = truncatedName.length > 2 ? [truncatedName[0], truncatedName[1] + '...'] : truncatedName;
        doc.text(nameToShow, x + cellWidth / 2, qrY + qrSize + 5.5, { align: 'center' });

        currentIndex++;
      }

      // Save PDF
      const cleanCatalogName = catalogName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Codigos_QR_${cleanCatalogName}.pdf`;
      doc.save(filename);

      toast.success(`PDF generado exitosamente con ${qrList.length} código(s) QR`);
    } catch (error) {
      console.error('Error al generar PDF de QRs:', error);
      toast.error('Ocurrió un error al generar el archivo PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generador de Códigos QR</h2>
              <p className="text-xs text-gray-500">
                Selecciona productos para generar una hoja imprimible en PDF con sus códigos QR.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search + Filters */}
        <div className="p-4 sm:p-6 bg-white border-b border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o código de producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:bg-white outline-none text-sm transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  statusFilter === 'active'
                    ? 'bg-white text-green-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                Activos ({products.filter(p => p.is_active !== false && p.classification !== 'out').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  statusFilter === 'inactive'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                Desactivados ({products.filter(p => p.is_active === false || p.classification === 'out').length})
              </button>
            </div>
          </div>

          {/* Quick Selection Actions */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4" /> Desmarcar todos
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" /> Seleccionar todos ({filteredProducts.length})
                  </>
                )}
              </button>
            </div>
            <div className="text-gray-500 font-medium">
              Seleccionados: <span className="font-bold text-indigo-600">{selectedProductIds.size}</span> productos ({totalQRsToGenerate} QRs total)
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 divide-y divide-gray-50">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No se encontraron productos</p>
              <p className="text-xs text-gray-400 mt-1">Prueba cambiando el filtro o la búsqueda</p>
            </div>
          ) : (
            filteredProducts.map(p => {
              const isSelected = selectedProductIds.has(p.id);
              const qty = quantities[p.id] || 1;
              const isActive = p.is_active !== false && p.classification !== 'out';

              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelectProduct(p.id)}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Image */}
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                      {p.photos && p.photos.length > 0 ? (
                        <img
                          src={p.photos[0]}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{p.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isActive ? 'Activo' : 'Desactivado'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700">
                          {p.code && p.code.trim() ? `CÓDIGO: ${p.code}` : '⚠️ Sin código (Se generará uno)'}
                        </span>
                        {p.ref_price ? (
                          <span className="font-medium text-gray-600">${p.ref_price.toFixed(2)} REF</span>
                        ) : null}
                        {p.cup_price ? (
                          <span className="font-medium text-gray-600">{p.cup_price} CUP</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Quantity selector (when selected) */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-2 self-end sm:self-center bg-white p-1 rounded-xl border border-gray-200 shadow-2xs"
                  >
                    <span className="text-xs text-gray-500 font-medium pl-2 pr-1">QRs:</span>
                    <button
                      type="button"
                      disabled={!isSelected || qty <= 1}
                      onClick={() => setProductQty(p.id, qty - 1)}
                      className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      disabled={!isSelected}
                      value={qty}
                      onChange={e => setProductQty(p.id, parseInt(e.target.value) || 1)}
                      className="w-10 text-center font-bold text-xs text-gray-900 outline-none disabled:opacity-40"
                    />
                    <button
                      type="button"
                      disabled={!isSelected}
                      onClick={() => setProductQty(p.id, qty + 1)}
                      className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 text-center sm:text-left">
            Genera un PDF no editable en formato parrilla (6 por fila) listo para imprimir en papel adhesivo o estándar.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={selectedProductIds.size === 0 || isGenerating}
              onClick={handleGeneratePDF}
              className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Generar PDF ({totalQRsToGenerate} QRs)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
