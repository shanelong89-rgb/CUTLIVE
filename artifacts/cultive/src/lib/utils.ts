import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time?: string): string {
  if (!time) return '';
  if (time.includes('-') || time.toLowerCase().includes(' to ')) {
    const sep = time.toLowerCase().includes(' to ') ? ' to ' : '-';
    const parts = time.split(new RegExp(`\\s*${sep === '-' ? '-' : 'to'}\\s*`, 'i'));
    if (parts.length === 2) {
      const a = formatTime(parts[0].trim());
      const b = formatTime(parts[1].trim());
      if (a && b) return `${a} – ${b}`;
    }
  }
  const s = time.trim();
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(s);
  if (ampm) {
    const h = parseInt(ampm[1], 10);
    const min = ampm[2] ? `:${ampm[2]}` : '';
    return `${h}${min} ${ampm[3].toUpperCase()}`;
  }
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (hhmm) {
    let h = parseInt(hhmm[1], 10);
    const min = hhmm[2];
    const period = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${min} ${period}`;
  }
  return s;
}
