import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
