import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(parsed.getTime())) return '—';
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch {
    return '—';
  }
}

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
};

function bcp47(locale: string | undefined): string {
  if (!locale) return 'en-US';
  return LOCALE_MAP[locale.toLowerCase()] ?? locale;
}

export function formatDateTime(
  date: string | Date | null | undefined,
  locale: string | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '—';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString(bcp47(locale), options);
  } catch {
    return '—';
  }
}

export function isSameDay(
  a: string | Date | null | undefined,
  b: Date,
  locale?: string,
): boolean {
  if (!a) return false;
  try {
    const parsed = typeof a === 'string' ? parseISO(a) : a;
    if (isNaN(parsed.getTime())) return false;
    const fmt = new Intl.DateTimeFormat(bcp47(locale), { year: 'numeric', month: '2-digit', day: '2-digit' });
    return fmt.format(parsed) === fmt.format(b);
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function platformIcon(platform: string): string {
  const map: Record<string, string> = {
    twitter: 'Twitter',
    x: 'Twitter',
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'Youtube',
    tiktok: 'TikTok',
    reddit: 'Reddit',
    linkedin: 'Linkedin',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon',
    threads: 'Threads',
  };
  return map[platform.toLowerCase()] || platform;
}

export function platformColor(platform: string): string {
  const map: Record<string, string> = {
    twitter: 'text-sky-500',
    x: 'text-neutral-900',
    facebook: 'text-blue-600',
    instagram: 'text-pink-500',
    youtube: 'text-red-600',
    tiktok: 'text-black',
    reddit: 'text-orange-500',
    linkedin: 'text-blue-700',
    bluesky: 'text-blue-400',
    mastodon: 'text-purple-600',
    threads: 'text-gray-900',
  };
  return map[platform.toLowerCase()] || 'text-gray-500';
}
