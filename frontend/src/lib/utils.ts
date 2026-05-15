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
