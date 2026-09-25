export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function getTodayISO(): string {
  return toISO(startOfDay(new Date()));
}

export function getTomorrowISO(): string {
  return toISO(addDays(startOfDay(new Date()), 1));
}

export function getDefaultStayDates(): { checkIn: string; checkOut: string } {
  return {
    checkIn: getTodayISO(),
    checkOut: '',
  };
}

export function getSavedOrInitialDates(storageKey = 'gokarna_search_dates'): { checkIn: string; checkOut: string } {
  const today = getTodayISO();
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const ci = parsed.checkIn || parsed.check_in;
      const co = parsed.checkOut || parsed.check_out;
      // If valid check-in
      if (ci && ci >= today) {
        return {
          checkIn: ci,
          checkOut: co && co > ci ? co : '',
        };
      }
    }
  } catch {}

  // If missing or past dates, return present date as check-in and empty check-out
  return {
    checkIn: today,
    checkOut: '',
  };
}
