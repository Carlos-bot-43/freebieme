export function getBirthdayMonth(): number | null {
  try {
    const stored = localStorage.getItem('freebieme_birthday_month');
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

export function setBirthdayMonth(month: number): void {
  try {
    localStorage.setItem('freebieme_birthday_month', String(month));
  } catch {
    // ignore
  }
}

export function isBirthdayMonth(): boolean {
  const stored = getBirthdayMonth();
  if (!stored) return false;
  return new Date().getMonth() + 1 === stored; // getMonth() is 0-indexed
}
