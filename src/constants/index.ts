import type { CurrencyCode } from '@/types';
import { toCurrencyCode } from '@/utils';

export { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from './theme';

export const APP_NAME = '记账本';

export const DB_NAME = 'money_track.db';

export const DEFAULT_CURRENCY: CurrencyCode = toCurrencyCode('CNY');

export const SYNC_TIMEOUT_MS = 60_000;
export const SYNC_PORT_RANGE = { min: 49152, max: 65535 };

export const PHOTO_MAX_WIDTH = 1200;
export const PHOTO_QUALITY = 0.8;

export const PROJECT_COLORS = [
  '#4F46E5', // Indigo
  '#0891B2', // Cyan
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#2563EB', // Blue
  '#65A30D', // Lime
  '#EA580C', // Orange
] as const;

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: '交通', icon: 'car', color: '#3B82F6' },
  { name: '住宿', icon: 'bed', color: '#8B5CF6' },
  { name: '餐饮', icon: 'restaurant', color: '#EF4444' },
  { name: '购物', icon: 'cart', color: '#F59E0B' },
  { name: '景点', icon: 'camera', color: '#10B981' },
  { name: '其他', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

export const COMMON_CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'CNY', name: '人民币', symbol: '¥' },
  { code: 'USD', name: '美元', symbol: '$' },
  { code: 'EUR', name: '欧元', symbol: '€' },
  { code: 'GBP', name: '英镑', symbol: '£' },
  { code: 'JPY', name: '日元', symbol: '¥' },
  { code: 'KRW', name: '韩元', symbol: '₩' },
  { code: 'THB', name: '泰铢', symbol: '฿' },
  { code: 'SGD', name: '新加坡元', symbol: 'S$' },
  { code: 'HKD', name: '港元', symbol: 'HK$' },
  { code: 'TWD', name: '新台币', symbol: 'NT$' },
  { code: 'AUD', name: '澳元', symbol: 'A$' },
  { code: 'CAD', name: '加元', symbol: 'C$' },
  { code: 'MYR', name: '马来西亚林吉特', symbol: 'RM' },
  { code: 'VND', name: '越南盾', symbol: '₫' },
  { code: 'IDR', name: '印尼盾', symbol: 'Rp' },
  { code: 'PHP', name: '菲律宾比索', symbol: '₱' },
  { code: 'NZD', name: '新西兰元', symbol: 'NZ$' },
  { code: 'CHF', name: '瑞士法郎', symbol: 'CHF' },
];
