import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, Download, ExternalLink, Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Catalog, Order, OrderItem, Product, User } from '../types';
import { dbService } from '../lib/supabase-service';
import { formatPrice, getCleanOrderNumber, getOrderCalculations } from '../lib/utils';

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
      dbService.getUsers()
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

  const calc = getOrderCalculations(order, catalog, products);
  const effectiveRate = calc.effectiveRate;
  const refTotal = calc.totalRefSum;
  const mnTotal = calc.totalCupSum;
  const grandTotal = calc.totalAPagarCUP;

  const invoiceDate = new Date(order.created_at).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const footerSettings = catalog.settings?.footer || {};
  const providerSettings = catalog.settings?.provider;

  const providerName = providerSettings?.name?.trim() || catalog.name;
  const providerDniNit = providerSettings?.dni_nit?.trim() || '';
  const providerCity = providerSettings?.city?.trim() || (footerSettings.address ? footerSettings.address.split(',')[0].trim() : '');
  const providerAddress = providerSettings?.address?.trim() || footerSettings.address || '';
  const providerContact = providerSettings?.contact?.trim() || footerSettings.email || '';
  const providerPhone = providerSettings?.phone?.trim() || footerSettings.phone || footerSettings.whatsapp || '';

  const dealTypeDescription = order.deal_type || 'Factura de Mercancía';

  // Construct jsPDF Instance for Export & Direct Print
  const generateInvoicePdfDoc = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const margin = 12;
    const pageWidth = 215.9;
    const pageHeight = 279.4;
    const usableWidth = pageWidth - (margin * 2); // 191.9 mm
    let y = 14; // starting Y coordinate at top of page

    // 1. Header Title & Right Info
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('Factura', margin, y);
    
    // Underline
    const titleWidth = pdf.getTextWidth('Factura');
    pdf.setLineWidth(0.5);
    pdf.line(margin, y + 1.5, margin + titleWidth, y + 1.5);

    // Header Right
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Original', pageWidth - margin, y - 2, { align: 'right' });

    pdf.setFontSize(8.5);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const headerRightText = `Número: ${formattedInvoiceNumber}   Fecha: ${invoiceDate}`;
    pdf.text(headerRightText, pageWidth - margin, y + 3.5, { align: 'right' });

    y += 10;

    // 2. Client & Provider Boxes
    const boxGap = 4;
    const boxWidth = (usableWidth - boxGap) / 2; // ~93.95mm
    const boxY = y;
    const labelXWidth = 22; // width for key labels

    // Render Box Content Helper
    const renderInfoBox = (x: number, rows: { label: string; value: string }[]) => {
      let currentY = boxY + 3.5;
      rows.forEach(({ label, value }) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(40, 40, 40);
        pdf.text(label, x + 3, currentY);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        
        const valX = x + 3 + labelXWidth;
        const maxValWidth = boxWidth - labelXWidth - 5;
        const splitVal = pdf.splitTextToSize(value || '', maxValWidth);
        pdf.text(splitVal, valX, currentY);
        
        const lines = Array.isArray(splitVal) ? splitVal.length : 1;
        currentY += 3.6 * lines;
      });
      return currentY - boxY + 1.5;
    };

    const clientRows = [
      { label: 'Cliente:', value: clientData?.full_name || clientData?.company_name || clientData?.username || '' },
      { label: 'DNI:', value: clientData?.ci_number || '' },
      { label: 'Número IVA:', value: clientData?.nit || '' },
      { label: 'Ciudad:', value: clientData?.province ? `${clientData.province}${clientData.municipality ? `, ${clientData.municipality}` : ''}` : '' },
      { label: 'Dirección:', value: clientData?.address_detail || '' },
      { label: 'Contacto:', value: clientData?.email || '' },
      { label: 'Teléfono:', value: clientData?.phone || '' },
    ];

    const providerRows = [
      { label: 'Proveedor:', value: providerName },
      { label: 'DNI:', value: providerDniNit },
      { label: 'Ciudad:', value: providerCity },
      { label: 'Dirección:', value: providerAddress },
      { label: 'Contacto:', value: providerContact },
      { label: 'Teléfono:', value: providerPhone },
    ];

    const clientHeight = renderInfoBox(margin, clientRows);
    const providerHeight = renderInfoBox(margin + boxWidth + boxGap, providerRows);
    const maxBoxHeight = Math.max(clientHeight, providerHeight, 30);

    // Draw Box Outer Borders
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, boxY, boxWidth, maxBoxHeight);
    pdf.rect(margin + boxWidth + boxGap, boxY, boxWidth, maxBoxHeight);

    y = boxY + maxBoxHeight + 4;

    // 3. Deal details
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Descripción del trato:', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dealTypeDescription, margin + 32, y);

    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Lugar del trato:', margin, y);
    pdf.setFont('helvetica', 'normal');
    const dealPlace = clientData?.address_detail || (providerAddress !== '-' ? providerAddress : footerSettings.address) || '';
    pdf.text(dealPlace, margin + 24, y);

    y += 5;

    // 4. Products Table
    const cols = [
      { name: 'No.', width: 8, align: 'left' },
      { name: 'Código', width: 25, align: 'left' },
      { name: 'Mercancía', width: 76.9, align: 'left' },
      { name: 'Medida', width: 14, align: 'center' },
      { name: 'Cant.', width: 18, align: 'right' },
      { name: 'Precio', width: 22, align: 'right' },
      { name: 'Importe', width: 28, align: 'right' }
    ];

    // Header Row Background (#cfcfcf)
    pdf.setFillColor(207, 207, 207);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, y, usableWidth, 5.5, 'F');

    let currentX = margin;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);

    cols.forEach(col => {
      pdf.rect(currentX, y, col.width, 5.5, 'S');

      let textX = currentX + 1.5;
      if (col.align === 'center') textX = currentX + (col.width / 2);
      if (col.align === 'right') textX = currentX + col.width - 1.5;
      
      pdf.text(col.name, textX, y + 3.8, { align: col.align as any });
      currentX += col.width;
    });

    y += 5.5;

    // Table Rows
    calc.itemCalculations.forEach(({ item, qty, isRef, refPrice, cupPrice, subtotalCup }, index) => {
      const prod = products.find(p => p.id === item.product_id || p.code === item.product_code);
      const code = item.product_code || prod?.code || '-';

      let merchandiseName = item.name;
      if (prod?.invoice_name) {
        const formattedCode = prod.code ? formatAxisPosProductCode(prod.code) : '';
        merchandiseName = formattedCode ? `${formattedCode} ${prod.invoice_name}` : prod.invoice_name;
      }

      const itemNo = (index + 1).toString();
      const qtyStr = formatQuantity(qty);
      const priceStr = formatSpanishCurrency(cupPrice);
      const totalStr = formatSpanishCurrency(subtotalCup);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const wrappedMerc = pdf.splitTextToSize(merchandiseName, cols[2].width - 3);
      const rowLines = Array.isArray(wrappedMerc) ? wrappedMerc.length : 1;
      const rowHeight = Math.max(5.5, rowLines * 3.8 + 1.5);

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);

      currentX = margin;
      cols.forEach(col => {
        pdf.rect(currentX, y, col.width, rowHeight, 'S');
        currentX += col.width;
      });

      currentX = margin;
      // Col 0: No.
      pdf.text(itemNo, currentX + 1.5, y + 3.8);
      currentX += cols[0].width;

      // Col 1: Código
      pdf.text(code, currentX + 1.5, y + 3.8);
      currentX += cols[1].width;

      // Col 2: Mercancía
      pdf.text(wrappedMerc, currentX + 1.5, y + 3.8);
      currentX += cols[2].width;

      // Col 3: Medida
      pdf.text('U', currentX + (cols[3].width / 2), y + 3.8, { align: 'center' });
      currentX += cols[3].width;

      // Col 4: Cant.
      pdf.text(qtyStr, currentX + cols[4].width - 1.5, y + 3.8, { align: 'right' });
      currentX += cols[4].width;

      // Col 5: Precio
      pdf.text(priceStr, currentX + cols[5].width - 1.5, y + 3.8, { align: 'right' });
      currentX += cols[5].width;

      // Col 6: Importe
      pdf.setFont('helvetica', 'bold');
      pdf.text(totalStr, currentX + cols[6].width - 1.5, y + 3.8, { align: 'right' });

      y += rowHeight;
    });

    y += 5; // Move totals block

    // 5. Payment & Totals
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Pago:', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(order.payment_method || 'Pago en efectivo', margin + 12, y);

    let pdfTotalY = y;

    if (refTotal > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Total REF:   $${refTotal.toFixed(2)} REF`, pageWidth - margin, pdfTotalY, { align: 'right' });
      pdfTotalY += 4;
    }

    if (refTotal > 0 && mnTotal > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`Total MN:   ${formatSpanishCurrency(mnTotal)}`, pageWidth - margin, pdfTotalY, { align: 'right' });
      pdfTotalY += 4;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Total:   ${formatSpanishCurrency(grandTotal)}`, pageWidth - margin, pdfTotalY, { align: 'right' });

    y = Math.max(y + 10, pdfTotalY + 5);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fecha de evento finaciero', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceDate, margin + 40, y);

    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Razon del trato:', margin, y);

    y += 8;

    // 6. Total en palabras
    pdf.setFontSize(10.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total (en palabras):', margin, y);
    const wordsText = numberToWordsSpanish(grandTotal);
    const splitWords = pdf.splitTextToSize(wordsText, usableWidth - 38);
    pdf.text(splitWords, margin + 38, y);

    const wordLinesCount = Array.isArray(splitWords) ? splitWords.length : 1;
    y += 4 + (wordLinesCount * 5);

    // 7. Signatures Boxes (3 columns)
    const sigGap = 4;
    const sigWidth = (usableWidth - (sigGap * 2)) / 3; // ~61.3mm
    const sigHeight = 25;

    // Box 1
    pdf.rect(margin, y, sigWidth, sigHeight);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recibido por:', margin + 2, y + 4);
    pdf.setFont('helvetica', 'normal');
    const recName = clientData?.full_name || clientData?.username || '';
    pdf.text(pdf.splitTextToSize(recName, sigWidth - 20), margin + 20, y + 4);

    pdf.setFont('helvetica', 'bold');
    pdf.text('DNI:', margin + 2, y + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(clientData?.ci_number || '', margin + 10, y + 8);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Responsable: __________________', margin + 2, y + sigHeight - 2.5);

    // Box 2 (Banco)
    const box2X = margin + sigWidth + sigGap;
    pdf.rect(box2X, y, sigWidth, sigHeight);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Banco:', box2X + 2, y + 4);
    pdf.text('BIC:', box2X + 2, y + 8);
    pdf.text('IBAN:', box2X + 2, y + 12);

    // Box 3 (Hecho por)
    const box3X = margin + (sigWidth * 2) + (sigGap * 2);
    pdf.rect(box3X, y, sigWidth, sigHeight);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Hecho por:', box3X + 2, y + 4);
    pdf.setFont('helvetica', 'normal');
    const makeName = currentUser?.full_name || catalog.name;
    pdf.text(pdf.splitTextToSize(makeName, sigWidth - 18), box3X + 17, y + 4);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Responsable: __________________', box3X + 2, y + sigHeight - 2.5);

    // 8. Footer (Placed cleanly at bottom of single page)
    const footerY = pageHeight - 10;
    pdf.setLineWidth(0.2);
    pdf.setDrawColor(180, 180, 180);
    pdf.line(margin, footerY, pageWidth - margin, footerY);

    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Impreso por ${catalog.name || 'TuCatalogo'}`, margin, footerY + 3.5);
    pdf.text('página 1 desde 1', pageWidth - margin, footerY + 3.5, { align: 'right' });

    return pdf;
  };

  // Convert HTML Invoice to Vector PDF (Selectable & Editable Text) and Download
  const handleConvertToPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await new Promise(res => setTimeout(res, 100));
      const pdf = generateInvoicePdfDoc();
      pdf.save(`Factura_${formattedInvoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF vectorial:', error);
      alert('Ocurrió un error al generar el PDF. Por favor reintente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print generated clean PDF directly using iframe / blob window without top margin or HTML DOM issues
  const handlePrint = async () => {
    setIsGeneratingPdf(true);
    try {
      await new Promise(res => setTimeout(res, 80));
      const pdf = generateInvoicePdfDoc();
      
      // Configure auto print on PDF document
      pdf.autoPrint();

      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);

      if (isMobile) {
        // Mobile browsers cannot print hidden iframes for PDF blobs reliably.
        // Try opening blob URL in new tab for PDF view/print, or fallback to window.print()
        const printWin = window.open(blobUrl, '_blank');
        if (!printWin) {
          window.print();
        }
      } else {
        // Desktop browsers: create hidden iframe to render PDF and trigger print dialog
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'fixed';
        printIframe.style.right = '0';
        printIframe.style.bottom = '0';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = '0';
        printIframe.src = blobUrl;
        document.body.appendChild(printIframe);

        printIframe.onload = () => {
          setTimeout(() => {
            try {
              printIframe.contentWindow?.focus();
              printIframe.contentWindow?.print();
            } catch (e) {
              console.warn('Iframe print error, falling back to window.print()', e);
              window.print();
            }
          }, 300);
        };
      }
    } catch (error) {
      console.error('Error al enviar a imprimir PDF:', error);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-2 sm:p-4 print:p-0 print:bg-white print:static print:block">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          div, main, section {
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          #invoice-letter-sheet, #invoice-letter-sheet * {
            visibility: visible !important;
          }
          #invoice-letter-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 4mm 8mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: letter portrait;
            margin: 0mm;
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
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Generar PDF e Imprimir en Hoja Carta"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Preparando PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-gray-300" />
                  <span>Imprimir PDF</span>
                </>
              )}
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
            className="w-full max-w-[816px] min-h-[1056px] print:min-h-0 print:h-auto print:max-w-none print:shadow-none print:border-none print:m-0 bg-white p-8 sm:p-10 text-black font-sans text-xs leading-tight shadow-xl border border-gray-300 my-auto box-border transition-all"
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
                {calc.itemCalculations.map(({ item, qty, isRef, refPrice, cupPrice, subtotalCup }, index) => {
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
                      <td className="border border-black px-1.5 py-1 text-right">{formatQuantity(qty)}</td>
                      <td className="border border-black px-1.5 py-1 text-right font-mono">{formatSpanishCurrency(cupPrice)}</td>
                      <td className="border border-black px-1.5 py-1 text-right font-mono font-bold">{formatSpanishCurrency(subtotalCup)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Payment & Totals */}
            <div className="flex justify-between items-start my-6 text-[11px] pt-3">
              <div className="space-y-1">
                <p><strong>Pago:</strong> <span className="font-bold">{order.payment_method || 'Pago en efectivo'}</span></p>
                <p><strong>Fecha de evento finaciero</strong> <span className="ml-4 font-bold">{invoiceDate}</span></p>
                <p><strong>Razon del trato:</strong></p>
              </div>
              <div className="text-right space-y-1">
                {refTotal > 0 && (
                  <p className="font-bold text-sm text-gray-500">
                    Total REF: <span className="font-mono font-bold text-gray-500 ml-2">${refTotal.toFixed(2)} REF</span>
                  </p>
                )}
                {refTotal > 0 && mnTotal > 0 && (
                  <p className="font-bold text-sm text-gray-800">
                    Total MN: <span className="font-mono font-bold text-gray-800 ml-2">{formatSpanishCurrency(mnTotal)}</span>
                  </p>
                )}
                <p className="font-bold text-base pt-0.5">
                  Total: <span className="font-black text-xl ml-2">{formatSpanishCurrency(grandTotal)}</span>
                </p>
              </div>
            </div>

            <div className="mb-6 p-2 bg-gray-50 border border-gray-300 rounded text-base sm:text-lg">
              <span className="font-bold text-gray-800">Total (en palabras): </span>
              <span className="font-black text-gray-900 capitalize">{numberToWordsSpanish(grandTotal)}</span>
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


