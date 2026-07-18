const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function displayDateRange(date?: string, dateEnd?: string | null): string {
  if (!date) return '';
  const parseYMD = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  };
  const start = parseYMD(date);
  if (!dateEnd) {
    if (start) return `${DAYS[start.getDay()]}, ${MONTHS[start.getMonth()]} ${start.getDate()}`;
    return date;
  }
  const end = parseYMD(dateEnd);
  if (!start || !end) {
    if (start) return `${DAYS[start.getDay()]}, ${MONTHS[start.getMonth()]} ${start.getDate()}`;
    // Start is a display string (e.g. "Jul 16, 2026") but end may be ISO —
    // parse the start loosely so multi-day ranges still render.
    if (end) {
      const loose = new Date(date);
      if (!isNaN(loose.getTime()) && loose.getTime() <= end.getTime()) {
        if (loose.getMonth() === end.getMonth() && loose.getFullYear() === end.getFullYear()) {
          if (loose.getDate() === end.getDate()) return `${DAYS[loose.getDay()]}, ${MONTHS[loose.getMonth()]} ${loose.getDate()}`;
          return `${MONTHS[loose.getMonth()]} ${loose.getDate()} – ${end.getDate()}`;
        }
        return `${MONTHS[loose.getMonth()]} ${loose.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`;
      }
    }
    return date;
  }
  // Same day — show as a single date
  if (start.getTime() === end.getTime()) {
    return `${DAYS[start.getDay()]}, ${MONTHS[start.getMonth()]} ${start.getDate()}`;
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`;
}

export function formatTime(time?: string | null): string {
  if (!time) return '';
  // Pass 1: convert any 24-hour HH:MM not already followed by AM/PM
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
  result = result.replace(/(am|pm)(?=[^a-zA-Z]|$)/gi, (m) => m.toUpperCase());
  return result;
}

export const REMEMBER_ME_KEY = 'cultive-remember-me';
