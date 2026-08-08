import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { dbService } from './supabase-service';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  const safePrice = (typeof price === 'number' && !isNaN(price) && isFinite(price)) ? price : 0;
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'CUP',
  }).format(safePrice);
}

export function getImageUrl(path: string | null | undefined, bucket: string = 'products') {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return path;
}

const DEFAULT_CLOUDINARY_LOGOS: Record<number, string> = {
  192: 'https://res.cloudinary.com/vj0gqfr2/image/upload/e_make_transparent:15/w_192,h_192,c_pad,b_transparent,f_png/v1786222701/tucatalogo/logos/j3jtcxae5vzmqdaw2vj3.jpg',
  512: 'https://res.cloudinary.com/vj0gqfr2/image/upload/e_make_transparent:15/w_512,h_512,c_pad,b_transparent,f_png/v1786222701/tucatalogo/logos/j3jtcxae5vzmqdaw2vj3.jpg',
  180: 'https://res.cloudinary.com/vj0gqfr2/image/upload/e_make_transparent:15/w_180,h_180,c_pad,b_transparent,f_png/v1786222701/tucatalogo/logos/j3jtcxae5vzmqdaw2vj3.jpg',
  64: 'https://res.cloudinary.com/vj0gqfr2/image/upload/e_make_transparent:15/w_64,h_64,c_pad,b_transparent,f_png/v1786222701/tucatalogo/logos/j3jtcxae5vzmqdaw2vj3.jpg'
};

export function getCloudinaryIconUrl(url: string | null | undefined, size: number = 512, makeTransparent: boolean = true): string {
  const transparentParam = makeTransparent ? 'e_make_transparent:15/' : '';

  if (!url) {
    return DEFAULT_CLOUDINARY_LOGOS[size] || DEFAULT_CLOUDINARY_LOGOS[512];
  }

  if (url.includes('res.cloudinary.com')) {
    // If URL already has Cloudinary transformations, replace cleanly
    if (url.includes('/upload/w_') || url.includes('/upload/e_make_transparent')) {
      return url.replace(/\/upload\/(e_make_transparent:[0-9]+\/)?(w_[^/]+\/)?/, `/upload/${transparentParam}w_${size},h_${size},c_pad,b_transparent,f_png/`);
    }
    return url.replace('/upload/', `/upload/${transparentParam}w_${size},h_${size},c_pad,b_transparent,f_png/`);
  }

  return DEFAULT_CLOUDINARY_LOGOS[size] || DEFAULT_CLOUDINARY_LOGOS[512];
}

export function getStoragePath(url: string, bucket: string = 'products') {
  return url || null;
}

export function getCleanOrderNumber(order: any): string {
  if (!order) return '26000001';
  if (order.order_number) {
    const digits = String(order.order_number).replace(/\D/g, '');
    if (digits.length >= 7) {
      return digits;
    }
  }
  const dateObj = order.created_at ? new Date(order.created_at) : new Date();
  const yearStr = dateObj.getFullYear().toString().slice(-2);
  const idxStr = String(order.order_index || 1).padStart(6, '0');
  return `${yearStr}${idxStr}`;
}

export async function getNextConsecutiveOrderInfo(catalogId?: string) {
  let existingOrders: any[] = [];
  try {
    const allOrders = (await dbService.getOrders()) || [];
    const catalogOrders = catalogId ? ((await dbService.getOrders(catalogId)) || []) : [];
    
    // Also include local storage orders directly to ensure deleted/cached orders preserve order numbers
    let localOrders: any[] = [];
    try {
      const raw = localStorage.getItem('app_local_orders');
      if (raw) localOrders = JSON.parse(raw);
    } catch (e) {}

    const orderMap = new Map<string, any>();
    allOrders.forEach((o: any) => orderMap.set(o.id, o));
    catalogOrders.forEach((o: any) => orderMap.set(o.id, o));
    localOrders.forEach((o: any) => {
      if (!orderMap.has(o.id)) orderMap.set(o.id, o);
    });
    existingOrders = Array.from(orderMap.values());
  } catch (err) {
    console.warn('Error fetching existing orders for consecutive numbering:', err);
  }

  const dateObj = new Date();
  const yearStr = dateObj.getFullYear().toString().slice(-2);

  let maxIndex = 0;

  (existingOrders || []).forEach((o: any) => {
    let idx = 0;
    if (typeof o.order_index === 'number' && o.order_index > 0) {
      idx = o.order_index;
    } else if (o.order_index && !isNaN(Number(o.order_index)) && Number(o.order_index) > 0) {
      idx = Number(o.order_index);
    } else if (o.order_number) {
      const digits = String(o.order_number).replace(/\D/g, '');
      if (digits.length >= 8) {
        const parsed = Number(digits.slice(2));
        if (!isNaN(parsed) && parsed > 0) {
          idx = parsed;
        }
      } else if (digits.length > 0) {
        const parsed = Number(digits);
        if (!isNaN(parsed) && parsed > 0) {
          idx = parsed;
        }
      }
    }

    if (idx > maxIndex) {
      maxIndex = idx;
    }
  });

  const nextIndex = maxIndex + 1;
  const seqStr = String(nextIndex).padStart(6, '0');
  const generatedOrderNumber = `${yearStr}${seqStr}`;

  return {
    newIndex: nextIndex,
    generatedOrderNumber
  };
}

export function getNextConsecutiveProductCode(products: any[]): string {
  if (!products || products.length === 0) {
    return '001';
  }

  let maxNum = 0;
  let detectedPrefix = '';
  let detectedPadLength = 3;
  let foundAnyNumber = false;

  products.forEach(p => {
    if (!p || !p.code) return;
    const str = String(p.code).trim();
    if (!str) return;

    // Match prefix + trailing digits e.g. "PRD-005" -> prefix "PRD-", digits "005"
    const match = str.match(/^(.*?)(\d+)$/);
    if (match) {
      foundAnyNumber = true;
      const prefix = match[1];
      const digitStr = match[2];
      const num = parseInt(digitStr, 10);

      if (num > maxNum) {
        maxNum = num;
        detectedPrefix = prefix;
        detectedPadLength = Math.max(digitStr.length, 3);
      }
    } else {
      const digitsOnly = str.replace(/\D/g, '');
      if (digitsOnly) {
        foundAnyNumber = true;
        const num = parseInt(digitsOnly, 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  if (!foundAnyNumber) {
    return '001';
  }

  const nextNum = maxNum + 1;
  const nextNumStr = String(nextNum).padStart(detectedPadLength, '0');
  return `${detectedPrefix}${nextNumStr}`;
}

export function roundPrice(price: number) {
  if (typeof price !== 'number' || isNaN(price) || !isFinite(price) || price <= 0) return 0;
  // Round up to values ending in 5 or 0
  const rounded = Math.ceil(price);
  const lastDigit = rounded % 10;
  if (lastDigit === 0 || lastDigit === 5) return rounded;
  if (lastDigit < 5) return rounded + (5 - lastDigit);
  return rounded + (10 - lastDigit);
}

export function getOrderCalculations(
  order: { items?: any[]; exchange_rate?: number; payment_method?: string },
  catalog?: { exchange_rate?: number; settings?: { exchange_rate_margin?: number } },
  products?: { id?: string; code?: string; classification?: string; sale_wholesale_price_ref?: number; ref_price?: number; custom_wholesale_price_mn?: number }[]
) {
  const orderRate = Number(order?.exchange_rate);
  const catRate = Number(catalog?.exchange_rate);
  const baseRate = (orderRate > 1 ? orderRate : (catRate > 1 ? catRate : (orderRate || catRate || 1)));
  const margin = Number(catalog?.settings?.exchange_rate_margin) || 0;
  const effectiveRate = baseRate + margin;
  const isPaymentRefMethod = Boolean(order?.payment_method && /dolar|usd|ref|dólar/i.test(order.payment_method));

  let totalRefSum = 0;
  let totalCupSum = 0;

  const itemCalculations = (order?.items || []).map(item => {
    const qty = Number(item.quantity) || 1;
    const itemPrice = Number(item.price) || 0;

    const prod = products?.find(p => (p.id && p.id === item.product_id) || (p.code && p.code === item.product_code)) || item.product;
    const prodRefPrice = prod?.classification === 'sale' && prod?.sale_wholesale_price_ref 
      ? prod.sale_wholesale_price_ref 
      : (prod?.ref_price || Number(item.ref_price) || 0);

    let isRef = false;
    if (item.pay_currency === 'REF') {
      isRef = true;
    } else if (item.pay_currency === 'MN') {
      isRef = false;
    } else {
      // Legacy order items without explicit pay_currency field
      isRef = isPaymentRefMethod 
        || (prodRefPrice > 0 && Math.abs(itemPrice - prodRefPrice) < 0.001)
        || (Number(item.ref_price) > 0 && Math.abs(itemPrice - Number(item.ref_price)) < 0.001);
    }

    let refPrice = 0;
    let cupPrice = 0;

    if (isRef) {
      if (itemPrice > 0 && prodRefPrice > 0 && Math.abs(itemPrice - prodRefPrice) < 0.001) {
        refPrice = itemPrice;
      } else if (prodRefPrice > 0) {
        refPrice = prodRefPrice;
      } else if (Number(item.ref_price) > 0) {
        refPrice = Number(item.ref_price);
      } else if (itemPrice > 0) {
        refPrice = itemPrice;
      }
      cupPrice = refPrice * effectiveRate;

      totalRefSum += refPrice * qty;
    } else {
      cupPrice = itemPrice;
      if (cupPrice <= 0 && prodRefPrice > 0) {
        cupPrice = prod?.custom_wholesale_price_mn || roundPrice(prodRefPrice * effectiveRate);
      }
      refPrice = prodRefPrice > 0 ? prodRefPrice : (baseRate > 0 ? cupPrice / baseRate : 0);
      totalCupSum += cupPrice * qty;
    }

    return {
      item,
      qty,
      isRef,
      refPrice,
      cupPrice,
      subtotalRef: refPrice * qty,
      subtotalCup: cupPrice * qty
    };
  });

  const totalAPagarCUP = itemCalculations.reduce((acc, curr) => acc + curr.subtotalCup, 0);
  const totalRefToCup = itemCalculations.filter(i => i.isRef).reduce((acc, curr) => acc + curr.subtotalCup, 0);

  return {
    baseRate,
    margin,
    effectiveRate,
    totalRefSum,
    totalCupSum,
    totalRefToCup,
    totalAPagarCUP,
    itemCalculations
  };
}

export async function optimizeImage(file: File, maxHeight = 2560): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', 0.85); // Good quality
    };
    img.onerror = reject;
  });
}
