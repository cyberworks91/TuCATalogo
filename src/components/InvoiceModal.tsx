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

function numberToWordsSpanish(amount: number): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
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
        output += decenas[d] + (u > 0 ? ' Y ' + unidades[u] : '');
      }
    }
    return output.trim();
  };

  if (amount <= 0) return 'CERO CON 00/100';

  const intPart = Math.floor(amount);
  const cents = Math.round((amount - intPart) * 100);
  const centsStr = cents < 10 ? `0${cents}` : `${cents}`;

  let words = '';
  const millones = Math.floor(intPart / 1000000);
  const miles = Math.floor((intPart % 1000000) / 1000);
  const cientos = intPart % 1000;

  if (millones > 0) {
    words += (millones === 1 ? 'UN MILLÓN ' : `${convertGroup(millones)} MILLONES `);
  }
  if (miles > 0) {
    words += (miles === 1 ? 'UN MIL ' : `${convertGroup(miles)} MIL `);
  }
  if (cientos > 0) {
    words += convertGroup(cientos);
  }

  words = words.trim() || 'CERO';
  return `${words} CON ${centsStr}/100`;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  catalog,
  products = [],
  currentUser,
  onClose
}) => {
  const [clientData, setClientData] = useState<Partial<User> | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Generate PDF from DOM
  const generatePDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      // Small delay to ensure styles and fonts rendered
      await new Promise(res => setTimeout(res, 250));

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Remove or sanitize oklch color functions in cloned document stylesheets to avoid html2canvas parser error
          const styleElements = clonedDoc.querySelectorAll('style');
          styleElements.forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
              styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/g, 'rgba(0,0,0,1)');
            }
          });

          const target = clonedDoc.getElementById('invoice-pdf-target');
          if (target) {
            target.style.position = 'static';
            target.style.top = '0';
            target.style.left = '0';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(blobUrl);
    } catch (error) {
      console.error('Error generando PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generatePDF();
  }, [clientData]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `Factura_${formattedInvoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch {
        window.print();
      }
    } else {
      window.print();
    }
  };

  const handleOpenNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
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
  const providerDniNit = providerSettings?.dni_nit?.trim() || '-';
  const providerCity = providerSettings?.city?.trim() || (footerSettings.address ? footerSettings.address.split(',')[0].trim() : '-');
  const providerAddress = providerSettings?.address?.trim() || footerSettings.address || '-';
  const providerContact = providerSettings?.contact?.trim() || footerSettings.email || catalog.name;
  const providerPhone = providerSettings?.phone?.trim() || footerSettings.phone || footerSettings.whatsapp || '-';

  const dealTypeDescription = order.deal_type || 'Factura de Mercancía';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[200] p-2 sm:p-4 print:p-0 print:bg-white print:static print:block">
      {/* Off-screen Printable Target for html2canvas */}
      <div 
        ref={invoiceRef} 
        id="invoice-pdf-target"
        style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: '#ffffff', color: '#000000' }}
        className="p-8 text-black font-sans text-xs leading-tight"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black border-b-2 border-black pb-1 inline-block">Factura</h1>
          </div>
          <div className="text-right">
            <span className="text-gray-500 font-bold text-base block mb-1">Original</span>
            <p className="font-mono text-sm"><strong>Número:</strong> {formattedInvoiceNumber}</p>
            <p className="font-mono text-sm"><strong>Fecha:</strong> {invoiceDate}</p>
          </div>
        </div>

        {/* Client & Provider Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Client Box */}
          <div className="border border-black p-3 space-y-1 rounded-sm">
            <p className="font-bold text-sm mb-2 border-b border-gray-300 pb-1">Cliente:</p>
            <p><strong>Nombre:</strong> {clientData?.full_name || clientData?.company_name || clientData?.username || 'Cliente'}</p>
            <p><strong>DNI / CI:</strong> {clientData?.ci_number || '-'}</p>
            <p><strong>Número IVA / NIT:</strong> {clientData?.nit || '-'}</p>
            <p><strong>Ciudad:</strong> {clientData?.province ? `${clientData.province}, ${clientData.municipality || ''}` : '-'}</p>
            <p><strong>Dirección:</strong> {clientData?.address_detail || clientData?.company_name || '-'}</p>
            <p><strong>Contacto:</strong> {clientData?.email || clientData?.full_name || '-'}</p>
            <p><strong>Teléfono:</strong> {clientData?.phone || '-'}</p>
          </div>

          {/* Provider Box */}
          <div className="border border-black p-3 space-y-1 rounded-sm">
            <p className="font-bold text-sm mb-2 border-b border-gray-300 pb-1">Proveedor:</p>
            <p><strong>Nombre:</strong> {providerName}</p>
            <p><strong>DNI / NIT:</strong> {providerDniNit}</p>
            <p><strong>Ciudad:</strong> {providerCity}</p>
            <p><strong>Dirección:</strong> {providerAddress}</p>
            <p><strong>Contacto:</strong> {providerContact}</p>
            <p><strong>Teléfono:</strong> {providerPhone}</p>
          </div>
        </div>

        {/* Deal details */}
        <div className="mb-4 space-y-1 font-medium">
          <p><strong>Descripción del trato:</strong> {dealTypeDescription} - Pedido #{formattedInvoiceNumber}</p>
          <p><strong>Lugar del trato:</strong> {clientData?.address_detail || (providerAddress !== '-' ? providerAddress : footerSettings.address) || 'Oficina Principal'}</p>
        </div>

        {/* Products Table */}
        <table className="w-full border-collapse border border-black mb-4">
          <thead>
            <tr className="bg-gray-200 text-black text-left font-bold border-b border-black">
              <th className="border border-black p-1.5 text-center w-10">No.</th>
              <th className="border border-black p-1.5 w-24">Código</th>
              <th className="border border-black p-1.5">Mercancía</th>
              <th className="border border-black p-1.5 text-center w-16">Medida</th>
              <th className="border border-black p-1.5 text-center w-14">Cant.</th>
              <th className="border border-black p-1.5 text-right w-24">Precio</th>
              <th className="border border-black p-1.5 text-right w-24">Importe</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => {
              const prod = products.find(p => p.id === item.product_id || p.code === item.product_code);
              const merchandiseName = prod?.invoice_name || item.name;
              const code = item.product_code || prod?.code || '-';

              return (
                <tr key={index} className="border-b border-black">
                  <td className="border border-black p-1.5 text-center">{index + 1}</td>
                  <td className="border border-black p-1.5 font-mono text-xs">{code}</td>
                  <td className="border border-black p-1.5 font-medium">{merchandiseName}</td>
                  <td className="border border-black p-1.5 text-center text-xs">Uds.</td>
                  <td className="border border-black p-1.5 text-center font-bold">{item.quantity}</td>
                  <td className="border border-black p-1.5 text-right font-mono">{formatPrice(item.price)}</td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">{formatPrice(item.price * item.quantity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Payment & Totals */}
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <p><strong>Pago:</strong> Pago en efectivo</p>
            <p><strong>Fecha de evento financiero:</strong> {invoiceDate}</p>
            <p><strong>Razón del trato:</strong> {dealTypeDescription}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black">Total: {formatPrice(totalAmount)}</p>
          </div>
        </div>

        <div className="mb-6 pb-2 border-b border-gray-300">
          <p><strong>Total (en palabras):</strong> <span className="uppercase font-semibold">{numberToWordsSpanish(totalAmount)}</span></p>
        </div>

        {/* Bottom Signatures */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="border border-black p-2.5 min-h-[100px] flex flex-col justify-between">
            <div>
              <p><strong>Recibido por:</strong> {clientData?.full_name || '-'}</p>
              <p><strong>DNI:</strong> {clientData?.ci_number || '-'}</p>
            </div>
            <p className="mt-4"><strong>Responsable:</strong> __________________</p>
          </div>

          <div className="border border-black p-2.5 min-h-[100px]">
            <p><strong>Banco:</strong> -</p>
            <p><strong>BIC:</strong> -</p>
            <p><strong>IBAN:</strong> -</p>
          </div>

          <div className="border border-black p-2.5 min-h-[100px] flex flex-col justify-between">
            <div>
              <p><strong>Hecho por:</strong> {currentUser?.full_name || catalog.name}</p>
            </div>
            <p className="mt-4"><strong>Responsable:</strong> __________________</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-gray-200">
          <span>Impreso por TuCatalogo</span>
          <span>página 1 desde 1</span>
        </div>
      </div>

      {/* Main PDF Viewer Modal */}
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl flex flex-col my-auto h-[90vh] overflow-hidden border border-gray-200">
        {/* Top Header Controls */}
        <div className="p-4 border-b flex flex-wrap justify-between items-center bg-gray-900 text-white rounded-t-2xl gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            <span className="font-extrabold text-base tracking-wide">Visor PDF — Factura #{formattedInvoiceNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                  title="Descargar archivo PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                  title="Imprimir PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition-all"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white ml-2"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content / PDF Viewer Body */}
        <div className="flex-1 bg-gray-200 relative flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              <p className="text-gray-800 font-bold text-sm">Generando documento PDF de la factura...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=1`}
              title={`Factura_${formattedInvoiceNumber}`}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow">
              <p className="text-red-600 font-bold mb-2">No se pudo generar la vista previa en PDF.</p>
              <button
                type="button"
                onClick={generatePDF}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
