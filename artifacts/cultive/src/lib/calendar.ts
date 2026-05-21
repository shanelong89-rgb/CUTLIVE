import type { Event } from './supabase';

function parseDate(raw: string, timeStr?: string): Date | null {
  if (!raw) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = raw.trim().toLowerCase();
  let base: Date | null = null;
  if (s.includes('today')) base = new Date(today);
  else if (s.includes('tomorrow')) base = new Date(today.getTime() + 86400000);
  else {
    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) base = direct;
    else {
      const m = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
      if (m) {
        const guess = new Date(`${m[1]} ${m[2]}, ${now.getFullYear()}`);
        if (!isNaN(guess.getTime())) base = guess;
      }
    }
  }
  if (!base) return null;
  if (timeStr) {
    const tm = timeStr.match(/(\d{1,2})[:\.](\d{2})/);
    if (tm) base.setHours(parseInt(tm[1], 10), parseInt(tm[2], 10), 0, 0);
    else base.setHours(19, 0, 0, 0);
  } else {
    base.setHours(19, 0, 0, 0);
  }
  return base;
}

function icsDate(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

export function googleCalendarUrl(event: Event): string {
  const start = parseDate(event.date, event.time);
  if (!start) return 'https://calendar.google.com/calendar/r';
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const details = [
    event.description,
    event.price ? `Entry: ${event.price}` : null,
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${icsDate(start)}/${icsDate(end)}`,
    details,
    location: event.venue || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function downloadICS(event: Event): void {
  const start = parseDate(event.date, event.time);
  if (!start) return;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const desc = escapeICS(
    [event.description, event.price ? `Entry: ${event.price}` : null]
      .filter(Boolean)
      .join('\n'),
  );
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CULTIVE//HK//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@cultive.hk`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${escapeICS(event.venue || '')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
