import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { dbService } from './supabase-service';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'CUP',
  }).format(price);
}

export function getImageUrl(path: string | null | undefined, bucket: string = 'products') {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return `/ft/${path}`;
  
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function getStoragePath(url: string, bucket: string = 'products') {
  if (!url) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return url;
  const prefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
  if (url.startsWith(prefix)) {
    return url.replace(prefix, '');
  }
  return url;
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
    
    const orderMap = new Map<string, any>();
    allOrders.forEach((o: any) => orderMap.set(o.id, o));
    catalogOrders.forEach((o: any) => orderMap.set(o.id, o));
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

export function roundPrice(price: number) {
  // Round up to values ending in 5 or 0
  const rounded = Math.ceil(price);
  const lastDigit = rounded % 10;
  if (lastDigit === 0 || lastDigit === 5) return rounded;
  if (lastDigit < 5) return rounded + (5 - lastDigit);
  return rounded + (10 - lastDigit);
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
