import * as Crypto from 'expo-crypto';
import type { UUID, ISODateString, CurrencyCode } from '@/types';

export function generateUUID(): UUID {
  return Crypto.randomUUID() as UUID;
}

export function nowISO(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

export function toISO(date: Date | string): ISODateString {
  if (typeof date === 'string') {
    return new Date(date).toISOString() as ISODateString;
  }
  return date.toISOString() as ISODateString;
}

export function toCurrencyCode(code: string): CurrencyCode {
  return code.toUpperCase() as CurrencyCode;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency as string,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: ISODateString | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(date: ISODateString | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function err<E = Error>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
