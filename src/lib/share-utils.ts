import { Product, Catalog } from '../types';
import { roundPrice, getImageUrl } from './utils';

export function formatSharePriceMN(price: number): string {
  const safePrice = (typeof price === 'number' && !isNaN(price) && isFinite(price)) ? price : 0;
  const isInt = Number.isInteger(safePrice);
  const parts = isInt ? safePrice.toString() : safePrice.toFixed(2);
  const [integerPart, decimalPart] = parts.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  return `${formattedNumber} CUP`;
}

export function generateProductShareText(
  product: Product,
  catalog: { slug: string; name?: string; exchange_rate?: number; settings?: any }
): { text: string; productUrl: string; photoUrl: string } {
  const shareCurrency = catalog?.settings?.share_currency || 'MN';
  const effectiveRate = (Number(catalog?.exchange_rate) || 1) + (Number(catalog?.settings?.exchange_rate_margin) || 0);

  const lines: string[] = [];

  // 1. Estado del producto
  if (product.classification === 'sale') {
    lines.push('🔥 *Producto en oferta*');
  } else if (product.classification === 'new') {
    lines.push('✨ *Nuevo producto*');
  }
  // If 'stock' / normal / other, do not show any status line.

  // 2. Nombre del producto
  lines.push(`🛍️ *${product.name}*`);

  // 3. Precio según moneda para compartir (MN o USD)
  const isWholesaleActive = catalog?.settings?.sale_type_wholesale !== false;
  const isRetailActive = catalog?.settings?.sale_type_retail !== false;

  const refPrice = product.classification === 'sale' && product.sale_wholesale_price_ref && product.sale_wholesale_price_ref > 0
    ? Number(product.sale_wholesale_price_ref)
    : Number(product.ref_price || 0);

  const retailCupPrice = product.classification === 'sale' && product.sale_price && product.sale_price > 0
    ? Number(product.sale_price)
    : Number(product.cup_price || 0);

  if (shareCurrency === 'USD') {
    if (isWholesaleActive && refPrice > 0) {
      lines.push(`💰 *Precio Mayorista:* $${refPrice.toFixed(2)} USD`);
      if (isRetailActive && retailCupPrice > 0) {
        const retailUsd = (retailCupPrice / (effectiveRate || 1)).toFixed(2);
        lines.push(`🏷️ *Precio Minorista:* $${retailUsd} USD`);
      }
    } else if (isRetailActive && retailCupPrice > 0) {
      const retailUsd = (retailCupPrice / (effectiveRate || 1)).toFixed(2);
      lines.push(`💰 *Precio:* $${retailUsd} USD`);
    } else {
      lines.push(`💰 *Precio:* $${refPrice.toFixed(2)} USD`);
    }
  } else {
    // MN (CUP)
    const wholesaleMn = product.custom_wholesale_price_mn || roundPrice(refPrice * effectiveRate);
    if (isWholesaleActive && wholesaleMn > 0) {
      lines.push(`💰 *Precio Mayorista:* ${formatSharePriceMN(wholesaleMn)}`);
      if (isRetailActive && retailCupPrice > 0) {
        lines.push(`🏷️ *Precio Minorista:* ${formatSharePriceMN(retailCupPrice)}`);
      }
    } else if (isRetailActive && retailCupPrice > 0) {
      lines.push(`💰 *Precio:* ${formatSharePriceMN(retailCupPrice)}`);
    } else {
      lines.push(`💰 *Precio:* ${formatSharePriceMN(wholesaleMn)}`);
    }
  }

  // 4. Compra mínima
  const minQty = Number(product.min_wholesale_qty) || 1;
  lines.push(`📦 *Compra mínima:* ${minQty} ${minQty === 1 ? 'unidad' : 'unidades'}`);

  // 5. Descripción (si la tiene, eliminando metadatos internos)
  const cleanDesc = product.description
    ? product.description
        .replace(/\[box:\d+\]/gi, '')
        .replace(/\[invoice_name:.*?\]/gi, '')
        .trim()
    : '';

  if (cleanDesc) {
    lines.push(`📝 *Descripción:* ${cleanDesc}`);
  }

  // 6. Enlace directo al producto
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const productUrl = `${origin}/${catalog.slug}?product=${product.id}`;
  lines.push(`🔗 *Ver producto:* ${productUrl}`);

  // 7. Foto si existe
  const rawPhoto = product.photos && product.photos.length > 0 ? product.photos[0] : '';
  const photoUrl = rawPhoto ? getImageUrl(rawPhoto, 'products') : '';

  const fullText = lines.join('\n');
  return { text: fullText, productUrl, photoUrl };
}

export async function shareProductToWhatsApp(
  product: Product,
  catalog: { slug: string; name?: string; exchange_rate?: number; settings?: any }
): Promise<void> {
  const { text, productUrl, photoUrl } = generateProductShareText(product, catalog);

  // Intento de compartir nativo con archivo de imagen si el dispositivo lo soporta (móviles Android/iOS)
  if (typeof navigator !== 'undefined' && navigator.share && photoUrl) {
    try {
      // Intentar descargar la imagen para convertirla a File
      const response = await fetch(photoUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'jpg';
        const file = new File([blob], `producto-${product.id}.${extension}`, { type: blob.type });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: product.name,
            text: text,
            files: [file],
          });
          return;
        }
      }
    } catch (e: any) {
      // Si el usuario cancela la acción nativa de compartir
      if (e?.name === 'AbortError') {
        return;
      }
      // Si falló por CORS u otra limitación, continuar con el fallback directo de WhatsApp
    }
  }

  // Fallback directo a WhatsApp
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}
