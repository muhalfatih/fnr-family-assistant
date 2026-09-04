import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortRupiah(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)} jt`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  }
  return formatRupiah(amount);
}

export function formatCompactNumber(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formatted = "";
  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2)).toLocaleString("id-ID")}B`;
  } else if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2)).toLocaleString("id-ID")}M`;
  } else if (abs >= 1_000) {
    const val = abs / 1_000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(1)).toLocaleString("id-ID")}k`;
  } else {
    formatted = `${abs.toLocaleString("id-ID")}`;
  }

  return `${isNegative ? "-" : ""}${formatted}`;
}

export function formatCompactRupiah(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  return `${isNegative ? "-" : ""}Rp ${formatCompactNumber(abs)}`;
}

export function formatDateIndo(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeIndo(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Returns safe ISO start and end timestamps for any 'YYYY-MM' period,
 * correctly handling months with 28, 29, 30, or 31 days.
 */
export function getMonthDateRange(monthYear: string): { startDate: string; endDate: string } {
  const [yearStr, monthStr] = monthYear.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Formats a phone number into a masked Indonesian/international format with privacy stars.
 * Example:
 * '08123456789' or '628123456789' -> '+62-812-****-789'
 * '+6281234567890' -> '+62-812-****-7890'
 */
export function formatMaskedPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const cleaned = phone.trim().replace(/[^\d+]/g, "");

  let countryCode = "+62";
  let rest = "";

  if (cleaned.startsWith("+62")) {
    countryCode = "+62";
    rest = cleaned.slice(3);
  } else if (cleaned.startsWith("62")) {
    countryCode = "+62";
    rest = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    countryCode = "+62";
    rest = cleaned.slice(1);
  } else if (cleaned.startsWith("+")) {
    const match = cleaned.match(/^\+(\d{1,3})(.*)$/);
    if (match) {
      countryCode = `+${match[1]}`;
      rest = match[2];
    } else {
      rest = cleaned.slice(1);
    }
  } else {
    rest = cleaned;
  }

  if (rest.length <= 6) {
    return `${countryCode}-${rest}`;
  }

  const prefix = rest.slice(0, 3);
  const suffixLen = Math.min(4, Math.max(2, rest.length - 7));
  const suffix = rest.slice(-suffixLen);

  return `${countryCode}-${prefix}-****-${suffix}`;
}
