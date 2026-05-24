import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function displayDateRange(date?: string, dateEnd?: string | null): string {
  if (!date) return '';
  const parseYMD = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  };
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-US', opts);

  const start = parseYMD(date);

  // Both dates are ISO — full control over formatting
  if (start) {
    if (!dateEnd) return fmt(start, { weekday: 'short', month: 'short', day: 'numeric' });
    const end = parseYMD(dateEnd);
    if (!end || start.getTime() === end.getTime())
      return fmt(start, { weekday: 'short', month: 'short', day: 'numeric' });
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear())
      return `${fmt(start, { month: 'short' })} ${start.getDate()} – ${end.getDate()}`;
    return `${fmt(start, { month: 'short', day: 'numeric' })} – ${fmt(end, { month: 'short', day: 'numeric' })}`;
  }

  // Raw string fallback — strip the year and normalise the dash so it's
  // consistent with ISO-formatted events (e.g. "May 23 - June 7, 2026" → "May 23 – Jun 7")
  const crossMonth = date.match(
    /\b([A-Za-z]{3,})\s+(\d{1,2})\s*[-–]\s*([A-Za-z]{3,})\s+(\d{1,2})\b/
  );
  if (crossMonth) {
    const s = new Date(`${crossMonth[1]} ${crossMonth[2]}, ${new Date().getFullYear()}`);
    const e = new Date(`${crossMonth[3]} ${crossMonth[4]}, ${new Date().getFullYear()}`);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      return `${fmt(s, { month: 'short', day: 'numeric' })} – ${fmt(e, { month: 'short', day: 'numeric' })}`;
    }
  }
  // Last resort — just strip the year to keep it short
  return date.replace(/,?\s*20\d{2}\b/g, '').replace(/\s*-\s*/g, ' – ').trim();
}

export function formatTime(time?: string): string {
  if (!time) return '';
  // Pass 1: convert any 24-hour HH:MM that isn't already followed by AM/PM
  let result = time.trim().replace(
    /\b(\d{1,2}):(\d{2})(?!\s*[aApP][mM])/g,
    (_, hStr: string, min: string) => {
      let h = parseInt(hStr, 10);
      if (h > 23) return `${hStr}:${min}`;
      const period = h >= 12 ? 'PM' : 'AM';
      if (h === 0) h = 12;
      else if (h > 12) h -= 12;
      return `${h}:${min} ${period}`;
    }
  );
  // Pass 2: uppercase any remaining am/pm (handles "5-7pm", "9pm – 1am", etc.)
  // Use lookahead instead of \b so "7pm" (no space) is also caught.
  result = result.replace(/(am|pm)(?=[^a-zA-Z]|$)/gi, (m) => m.toUpperCase());
  return result;
}
