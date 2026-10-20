import { UserRole } from '../types';

export type AppTab =
  | 'reception'
  | 'finance'
  | 'manager'
  | 'store'
  | 'datas_history'
  | 'admin';

export const canManagePricing = (role?: UserRole | null): boolean =>
  role === 'finance' || role === 'admin';

export const canManagePriceList = (role?: UserRole | null): boolean =>
  role === 'finance' || role === 'admin';

export const canRegisterVehicles = (role?: UserRole | null): boolean =>
  role === 'reception' || role === 'admin';

export const canAssignTasks = (role?: UserRole | null): boolean =>
  role === 'manager' || role === 'admin';

export const canManageStore = (role?: UserRole | null): boolean =>
  role === 'storekeeper' || role === 'admin';

export const canViewReports = (role?: UserRole | null): boolean =>
  role === 'finance' || role === 'manager' || role === 'admin';

export const canDeleteJob = (role?: UserRole | null): boolean => role === 'admin';

const TAB_ACCESS: Record<AppTab, UserRole[]> = {
  reception: ['reception', 'admin'],
  finance: ['finance', 'admin'],
  manager: ['manager', 'admin'],
  store: ['storekeeper', 'admin'],
  datas_history: ['manager', 'finance', 'admin'],
  admin: ['admin'],
};

export const canAccessTab = (role: UserRole | null | undefined, tab: string): boolean => {
  if (!role) return false;
  const allowed = TAB_ACCESS[tab as AppTab];
  return allowed ? allowed.includes(role) : false;
};

export const defaultTabForRole = (role: UserRole): AppTab => {
  switch (role) {
    case 'reception':
      return 'reception';
    case 'finance':
      return 'finance';
    case 'manager':
      return 'manager';
    case 'storekeeper':
      return 'store';
    case 'admin':
      return 'manager';
    default:
      return 'reception';
  }
};
