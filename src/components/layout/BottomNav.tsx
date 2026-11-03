import React from 'react';
import { User } from '../../types';
import { canViewReports } from '../../services/permissions';
import {
  Car,
  Receipt,
  Kanban,
  Package,
  Database,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface BottomNavProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenReports: () => void;
}

/**
 * Mobile / small-screen bottom navigation — quick one-handed access
 * to the primary workspaces.
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenReports,
}) => {
  const { t } = useLanguage();
  const isAllowed = (roles: string[]) =>
    roles.includes(currentUser.role) || currentUser.role === 'admin';

  const items = [
    { id: 'manager', label: t('bottom.task'), icon: <Kanban className="w-5 h-5" />, allowed: isAllowed(['manager']) },
    { id: 'finance', label: t('bottom.finance'), icon: <Receipt className="w-5 h-5" />, allowed: isAllowed(['finance']) },
    { id: 'store', label: t('bottom.store'), icon: <Package className="w-5 h-5" />, allowed: isAllowed(['storekeeper']) },
    { id: 'datas_history', label: t('bottom.data'), icon: <Database className="w-5 h-5" />, allowed: isAllowed(['manager', 'finance']) },
    { id: 'reception', label: t('bottom.recorder'), icon: <Car className="w-5 h-5" />, allowed: isAllowed(['reception']) },
    { id: 'admin', label: t('bottom.admin'), icon: <Users className="w-5 h-5" />, allowed: currentUser.role === 'admin' },
  ].filter((i) => i.allowed);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line no-print">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`touch-target flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition cursor-pointer ${
                isActive ? 'text-brand' : 'text-ink-muted'
              }`}
            >
              <span
                className={`flex items-center justify-center w-9 h-7 rounded-lg ${
                  isActive ? 'bg-sand' : ''
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
        {canViewReports(currentUser.role) && (
          <button
            onClick={onOpenReports}
            className="touch-target flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-ink-muted transition cursor-pointer"
          >
            <span className="flex items-center justify-center w-9 h-7 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-semibold">{t('bottom.reports')}</span>
          </button>
        )}
      </div>
    </nav>
  );
};
