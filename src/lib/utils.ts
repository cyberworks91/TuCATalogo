import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
