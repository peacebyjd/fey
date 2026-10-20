import { SalaryProfile, WorkerCategory } from '../types';

/** Local calendar date as YYYY-MM-DD (avoids UTC day shifts). */
export const dateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const addDaysToKey = (key: string, days: number): string => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
};

/** Sunday that starts the week containing the given date. */
export const startOfWeekSunday = (date: Date = new Date()): string => {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return dateKey(copy);
};

export const currentWeekStart = (): string => startOfWeekSunday(new Date());

export const paydayForWeekStart = (weekStart: string): string =>
  addDaysToKey(weekStart, 6);

export const formatDateShort = (key: string): string =>
  parseDateKey(key).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const formatWeekRange = (weekStart: string): string =>
  `${formatDateShort(weekStart)} - ${formatDateShort(paydayForWeekStart(weekStart))}`;

export const guessWorkerCategory = (specialty: string): WorkerCategory => {
  const value = specialty.toLowerCase();
  if (value.includes('electric') || value.includes('electrical') || value.includes('ac ')) {
    return 'Electrical';
  }
  if (value.includes('body') || value.includes('paint')) {
    return 'Body';
  }
  return 'Mechanic';
};

export const DEFAULT_SALARY_PROFILES: SalaryProfile[] = [
  {
    id: 'sal-sami',
    mechanicId: 'mech-sami',
    workerName: 'Mechanic Sami',
    category: 'Mechanic',
    weeklySalary: 4500,
    active: true,
    updatedAt: '2026-10-18',
  },
  {
    id: 'sal-yeabsira',
    mechanicId: 'mech-yeabsira',
    workerName: 'Yeabsira Mekbeb',
    category: 'Mechanic',
    weeklySalary: 3800,
    active: true,
    updatedAt: '2026-10-18',
  },
  {
    id: 'sal-dawit',
    mechanicId: 'mech-dawit',
    workerName: 'Dawit Solomon',
    category: 'Electrical',
    weeklySalary: 4200,
    active: true,
    updatedAt: '2026-10-18',
  },
  {
    id: 'sal-ermiya',
    mechanicId: 'mech-ermiya',
    workerName: 'Mechanic Ermiya',
    category: 'Mechanic',
    weeklySalary: 4000,
    active: true,
    updatedAt: '2026-10-18',
  },
  {
    id: 'sal-abel',
    mechanicId: 'mech-abel',
    workerName: 'Abel Tesfaye',
    category: 'Body',
    weeklySalary: 3600,
    active: true,
    updatedAt: '2026-10-18',
  },
];
