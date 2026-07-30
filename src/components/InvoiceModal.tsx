import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, Download, ExternalLink, Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Catalog, Order, Product, User } from '../types';
import { dbService } from '../lib/supabase-service';
import { formatPrice, getCleanOrderNumber } from '../lib/utils';

interface InvoiceModalProps {
  order: Order;
  catalog: Catalog;
  products?: Product[];
  currentUser?: User | null;
  onClose: () => void;
}

function formatSpanishCurrency(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0,00';
  return amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatQuantity(qty: number): string {
  if (qty === null || qty === undefined || isNaN(qty)) return '0,000';
  return qty.toLocaleString('es-ES', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

function formatAxisPosProductCode(rawCode?: string): string {
  if (!rawCode) return '';
  const trimmed = rawCode.trim();
  return trimmed.replace(/-0+(\d+)/g, '-$1');
}

function numberToWordsSpanish(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'cero';

  const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    let output = '';
    const c = Math.floor(n / 100);
    const r = n % 100;
    if (c > 0) output += centenas[c] + ' ';
    if (r > 0) {
      if (r < 30) {
        output += unidades[r];
      } else {
        const d = Math.floor(r / 10);
        const u = r % 10;
        output += decenas[d] + (u > 0 ? ' y ' + unidades[u] : '');
      }
    }
    return output.trim();
  };

  const intPart = Math.floor(amount);
  let words = '';
  const millones = Math.floor(intPart / 1000000);
  const miles = Math.floor((intPart % 1000000) / 1000);
  const cientos = intPart % 1000;

  if (millones > 0) {
    words += (millones === 1 ? 'un millón ' : `${convertGroup(millones)} millones `);
  }
  if (miles > 0) {
    words += (miles === 1 ? 'un mil ' : `${convertGroup(miles)} mil `);
  }
  if (cientos > 0) {
    words += convertGroup(cientos);
  }

  return words.trim() || 'cero';
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  catalog,
  products = [],
  currentUser,
  onClose
}) => {
  const [clientData, setClientData] = useState<Partial<User> | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (order.user_id) {
      dbService.getClients(catalog.id)
        .then(clients => {
          if (!isMounted) return;
          const found = (clients || []).find((c: any) => c.id === order.user_id);
          if (found) {
            setClientData(found);
          } else if (currentUser && currentUser.id === order.user_id) {
            setClientData(currentUser);
          }
        })
        .catch(err => {
          console.warn('Error loading client for invoice:', err);
          if (currentUser) setClientData(currentUser);
        });
    } else if (currentUser) {
      setClientData(currentUser);
    }
    return () => { isMounted = false; };
  }, [order.user_id, catalog.id, currentUser]);

  const defaultPrefix = catalog.settings?.provider?.invoice_prefix?.trim() || (catalog.name ? catalog.name.trim().slice(0, 3).toUpperCase() : 'ESP');
  const cleanOrderNumber = getCleanOrderNumber(order);
  const formattedInvoiceNumber = `${defaultPrefix}${cleanOrderNumber}`;

  // Convert HTML Invoice to PDF and Download
  const handleConvertToPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await new Promise(res => setTimeout(res, 150));

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const styleElements = clonedDoc.querySelectorAll('style');
          styleElements.forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
              styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/g, 'rgba(0,0,0,1)');
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      pdf.save(`Factura_${formattedInvoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error al convertir/generar PDF:', error);
      alert('Ocurrió un error al generar el PDF. Por favor reintente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(order.created_at).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const totalAmount = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const footerSettings = catalog.settings?.footer || {};
  const providerSettings = catalog.settings?.provider;

  const providerName = providerSettings?.name?.trim() || catalog.name;
  const providerDniNit = providerSettings?.dni_nit?.trim() || '';
  const providerCity = providerSettings?.city?.trim() || (footerSettings.address ? footerSettings.address.split(',')[0].trim() : '');
  const providerAddress = providerSettings?.address?.trim() || footerSettings.address || '';
  const providerContact = providerSettings?.contact?.trim() || footerSettings.email || '';
  const providerPhone = providerSettings?.phone?.trim() || footerSettings.phone || footerSettings.whatsapp || '';

  const dealTypeDescription = order.deal_type || 'Factura de Mercancía';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-2 sm:p-4 print:p-0 print:bg-white print:static print:block">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #invoice-letter-sheet, #invoice-letter-sheet * {
            visibility: visible !important;
          }
          #invoice-letter-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          @page {
            size: letter portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Main Outer Container */}
      <div className="bg-gray-100 rounded-2xl max-w-5xl w-full shadow-2xl flex flex-col my-auto h-[92vh] overflow-hidden border border-gray-300 print:h-auto print:border-none print:shadow-none print:bg-white">
        
        {/* Header Bar with Action Buttons */}
        <div className="p-4 border-b flex flex-wrap justify-between items-center bg-gray-900 text-white rounded-t-2xl gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-wide text-white">Factura HTML (Hoja Carta)</h2>
              <p className="text-xs text-gray-400 font-mono">Número: #{formattedInvoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Convert to PDF Button */}
            <button
              type="button"
              onClick={handleConvertToPDF}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              title="Convertir factura HTML a documento PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Convertiendo a PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Convertir a PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
              title="Imprimir documento HTML en Hoja Carta"
            >
              <Printer className="w-4 h-4 text-gray-300" />
              <span>Imprimir</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-300 hover:text-white ml-1"
              title="Cerrar factura"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container for HTML Letter Sheet View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-200 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div 
            ref={invoiceRef} 
            id="invoice-letter-sheet"
            className="w-full max-w-[816px] min-h-[1056px] bg-white p-8 sm:p-10 text-black font-sans text-xs leading-tight shadow-xl border border-gray-300 my-auto box-border transition-all"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-black underline underline-offset-4">Factura</h1>
              </div>
              <div className="text-right text-xs space-y-1">
                <span className="text-gray-500 font-bold text-base block mb-1">Original</span>
                <p><strong>Número:</strong> <span className="font-mono font-bold ml-1">{formattedInvoiceNumber}</span> <strong className="ml-3">Fecha:</strong> <span className="font-bold ml-1">{invoiceDate}</span></p>
              </div>
            </div>

            {/* Client & Provider Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Client Box */}
              <div className="border border-black p-2.5 text-[11px] leading-snug overflow-hidden box-border">
                <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-x-2 gap-y-1">
                  <span className="text-gray-900">Cliente:</span>
                  <span className="font-bold min-w-0 break-words">{clientData?.full_name || clientData?.company_name || clientData?.username || ''}</span>
                  
                  <span className="text-gray-900">DNI</span>
                  <span className="font-bold min-w-0 break-words">{clientData?.ci_number || ''}</span>
                  
                  <span className="text-gray-900">Número IVA:</span>
                  <span className="font-bold min-w-0 break-words">{clientData?.nit || ''}</span>
                  
                  <span className="text-gray-900">Ciudad:</span>
                  <span className="font-bold min-w-0 break-words">{clientData?.province ? `${clientData.province}${clientData.municipality ? `, ${clientData.municipality}` : ''}` : ''}</span>
                  
                  <span className="text-gray-900">Dirección:</span>
                  <span className="font-bold min-w-0 break-words">{clientData?.address_detail || ''}</span>
                  
                  <span className="text-gray-900">Contacto:</span>
                  <span className="font-bold min-w-0 break-words">{clientData?.email || ''}</span>
                  
                  <span className="text-gray-900">Teléfono:</span>
                  <span className="font-bold min-w-0 break-words">{clientData?.phone || ''}</span>
                </div>
              </div>

              {/* Provider Box */}
              <div className="border border-black p-2.5 text-[11px] leading-snug overflow-hidden box-border">
                <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-x-2 gap-y-1">
                  <span className="text-gray-900">Proveedor:</span>
                  <span className="font-bold min-w-0 break-words">{providerName}</span>
                  
                  <span className="text-gray-900">DNI</span>
                  <span className="font-bold min-w-0 break-words">{providerDniNit}</span>
                  
                  <span className="text-gray-900">Ciudad:</span>
                  <span className="font-bold min-w-0 break-words">{providerCity}</span>
                  
                  <span className="text-gray-900">Dirección:</span>
                  <span className="font-bold min-w-0 break-words">{providerAddress}</span>
                  
                  <span className="text-gray-900">Contacto:</span>
                  <span className="font-bold min-w-0 break-words">{providerContact}</span>
                  
                  <span className="text-gray-900">Teléfono:</span>
                  <span className="font-bold min-w-0 break-words">{providerPhone}</span>
                </div>
              </div>
            </div>

            {/* Deal details */}
            <div className="mb-4 text-[11px] space-y-1">
              <p><strong>Descripción del trato:</strong> {dealTypeDescription}</p>
              <p><strong>Lugar del trato:</strong> {clientData?.address_detail || (providerAddress !== '-' ? providerAddress : footerSettings.address) || ''}</p>
            </div>

            {/* Products Table */}
            <table className="w-full border-collapse border border-black mb-4 text-[11px]">
              <thead>
                <tr className="bg-[#cfcfcf] text-black font-bold">
                  <th className="border border-black px-1.5 py-1 text-left w-8">No.</th>
                  <th className="border border-black px-1.5 py-1 text-left w-20">Código</th>
                  <th className="border border-black px-1.5 py-1 text-left">Mercancía</th>
                  <th className="border border-black px-1.5 py-1 text-center w-14">Medida</th>
                  <th className="border border-black px-1.5 py-1 text-right w-16">Cant.</th>
                  <th className="border border-black px-1.5 py-1 text-right w-20">Precio</th>
                  <th className="border border-black px-1.5 py-1 text-right w-24">Importe</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, index) => {
                  const prod = products.find(p => p.id === item.product_id || p.code === item.product_code);
                  const code = item.product_code || prod?.code || '-';

                  let merchandiseName = item.name;
                  if (prod?.invoice_name) {
                    const formattedCode = prod.code ? formatAxisPosProductCode(prod.code) : '';
                    merchandiseName = formattedCode ? `${formattedCode} ${prod.invoice_name}` : prod.invoice_name;
                  }

                  return (
                    <tr key={index} className="border-b border-black">
                      <td className="border border-black px-1.5 py-1 text-left">{index + 1}</td>
                      <td className="border border-black px-1.5 py-1 text-left font-mono">{code}</td>
                      <td className="border border-black px-1.5 py-1 text-left font-medium">{merchandiseName}</td>
                      <td className="border border-black px-1.5 py-1 text-center">U</td>
                      <td className="border border-black px-1.5 py-1 text-right">{formatQuantity(item.quantity)}</td>
                      <td className="border border-black px-1.5 py-1 text-right font-mono">{formatSpanishCurrency(item.price)}</td>
                      <td className="border border-black px-1.5 py-1 text-right font-mono font-bold">{formatSpanishCurrency(item.price * item.quantity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Payment & Totals */}
            <div className="flex justify-between items-start mb-4 text-[11px]">
              <div className="space-y-1">
                <p><strong>Pago:</strong> <span className="font-bold">{order.payment_method || 'Pago en efectivo'}</span></p>
                <p><strong>Fecha de evento finaciero</strong> <span className="ml-4 font-bold">{invoiceDate}</span></p>
                <p><strong>Razon del trato:</strong></p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base">Total: <span className="font-black text-xl ml-2">{formatSpanishCurrency(totalAmount)}</span></p>
              </div>
            </div>

            <div className="mb-6 text-[11px]">
              <span><strong>Total (en palabras):</strong> </span>
              <span className="font-bold">{numberToWordsSpanish(totalAmount)}</span>
            </div>

            {/* Bottom Signatures */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="border border-black p-2 min-h-[110px] text-[11px] flex flex-col justify-between">
                <div>
                  <p><strong>Recibido por:</strong> {clientData?.full_name || clientData?.username || ''}</p>
                  <p className="mt-1"><strong>DNI:</strong> {clientData?.ci_number || ''}</p>
                </div>
                <p><strong>Responsable:</strong> __________________</p>
              </div>

              <div className="border border-black p-2 min-h-[110px] text-[11px] space-y-1">
                <p><strong>Banco:</strong></p>
                <p><strong>BIC:</strong></p>
                <p><strong>IBAN:</strong></p>
              </div>

              <div className="border border-black p-2 min-h-[110px] text-[11px] flex flex-col justify-between">
                <div>
                  <p><strong>Hecho por:</strong> {currentUser?.full_name || catalog.name}</p>
                </div>
                <p><strong>Responsable:</strong> __________________</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center text-[10px] text-gray-700 pt-2 border-t border-gray-200">
              <span>Impreso por {catalog.name || 'TuCatalogo'}</span>
              <span>página 1 desde 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


