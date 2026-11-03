import React from 'react';
import { User } from '../../types';
import { canViewReports } from '../../services/permissions';
import {
  Car,
  Receipt,
  Kanban,
  Calculator,
  Users,
  FileSpreadsheet,
  Database,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
  onOpenReports,
  onOpenSettings,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { t } = useLanguage();
  const isAllowed = (roles: string[]) => {
    return roles.includes(currentUser.role) || currentUser.role === 'admin';
  };

  const navItems = [
    {
      id: 'manager',
      label: t('nav.taskBoard'),
      icon: <Kanban className="w-4 h-4 shrink-0" />,
      allowed: isAllowed(['manager']),
      subtitle: t('nav.taskBoardSub'),
    },
    {
      id: 'finance',
      label: t('nav.finance'),
      icon: <Receipt className="w-4 h-4 shrink-0" />,
      allowed: isAllowed(['finance']),
      subtitle: t('nav.financeSub'),
    },
    {
      id: 'store',
      label: t('nav.store'),
      icon: <Package className="w-4 h-4 shrink-0" />,
      allowed: isAllowed(['storekeeper']),
      subtitle: t('nav.storeSub'),
    },
    {
      id: 'datas_history',
      label: t('nav.dataArchive'),
      icon: <Database className="w-4 h-4 shrink-0" />,
      allowed: isAllowed(['manager', 'admin', 'finance']),
      subtitle: t('nav.dataArchiveSub'),
    },
    {
      id: 'reception',
      label: t('nav.recorder'),
      icon: <Car className="w-4 h-4 shrink-0" />,
      allowed: isAllowed(['reception']),
      subtitle: t('nav.recorderSub'),
    },
    {
      id: 'estimate',
      label: t('nav.estimate'),
      icon: <Calculator className="w-4 h-4 shrink-0" />,
      allowed: isAllowed(['reception', 'finance', 'manager']),
      subtitle: t('nav.estimateSub'),
    },
  ];

  return (
    <>
      {/* Mobile / Tablet overlay backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-ink/40 z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 md:top-[57px] bottom-0 left-0 bg-white border-r border-line z-40 md:z-10 flex flex-col justify-between transition-[transform,width] duration-200 ease-in-out h-screen md:h-[calc(100vh-57px)] no-print ${
          isCollapsed ? 'w-64 md:w-[68px]' : 'w-64'
        } ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'md:p-2 p-4' : 'p-4'}`}>
          {/* Desktop collapse toggle */}
          <div className={`hidden md:flex ${isCollapsed ? 'justify-center' : 'justify-end'} pb-2`}>
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-sand transition cursor-pointer"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Tablet view header */}
          <div className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-line">
            <span className="font-bold text-ink">{t('sidebar.navigation')}</span>
            <button
              onClick={onCloseMobile}
              className="text-xs text-ink-muted hover:text-ink p-1 cursor-pointer"
            >
              {t('sidebar.close')}
            </button>
          </div>

          {!isCollapsed && (
            <div className="mb-3 px-2">
              <p className="text-[11px] font-semibold text-ink-muted/70 uppercase tracking-wider">
                {t('nav.workflow')}
              </p>
            </div>
          )}

          <nav className="space-y-1">
            {navItems
              .filter((item) => item.allowed)
              .map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => {
                      setActiveTab(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex rounded-xl transition-colors cursor-pointer ${
                      isCollapsed
                        ? 'md:justify-center md:px-0 items-center gap-3 p-3'
                        : 'items-start gap-3 p-3'
                    } ${
                      isActive
                        ? 'bg-sand text-brand font-semibold shadow-soft'
                        : 'text-ink hover:bg-sand/50 font-medium'
                    }`}
                  >
                    <div className={`mt-0.5 ${isActive ? 'text-brand' : 'text-ink-muted'}`}>
                      {item.icon}
                    </div>
                    <div className={isCollapsed ? 'md:hidden' : ''}>
                      <div className="text-xs">{item.label}</div>
                      <div
                        className={`text-[10px] font-normal leading-tight ${
                          isActive ? 'text-brand/70' : 'text-ink-muted'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
          </nav>

          {(canViewReports(currentUser.role) || currentUser.role === 'admin') && (
            <>
              {!isCollapsed && (
                <div className="mt-6 mb-2 px-2">
                  <p className="text-[11px] font-semibold text-ink-muted/70 uppercase tracking-wider">
                    {t('nav.documentsAudit')}
                  </p>
                </div>
              )}

              <div className={`${isCollapsed ? 'mt-3' : 'mt-0'} space-y-1`}>
                {canViewReports(currentUser.role) && (
                  <button
                    title={isCollapsed ? t('nav.pdfReports') : undefined}
                    onClick={() => {
                      onOpenReports();
                      onCloseMobile();
                    }}
                    className={`w-full flex rounded-lg text-left text-xs font-medium text-ink hover:bg-sand/50 hover:text-ink transition-colors cursor-pointer ${
                      isCollapsed ? 'md:justify-center md:px-0 items-center gap-3 p-2.5' : 'items-center gap-3 p-2.5'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-ink-muted shrink-0" />
                    <span className={isCollapsed ? 'md:hidden' : ''}>{t('nav.pdfReports')}</span>
                  </button>
                )}

                {isAllowed(['admin']) && (
                  <button
                    title={isCollapsed ? t('nav.admin') : undefined}
                    onClick={() => {
                      setActiveTab('admin');
                      onCloseMobile();
                    }}
                    className={`w-full flex rounded-lg text-left text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-sand text-brand font-semibold'
                        : 'text-ink hover:bg-sand/50 hover:text-ink'
                    } ${
                      isCollapsed ? 'md:justify-center md:px-0 items-center gap-3 p-2.5' : 'items-center gap-3 p-2.5'
                    }`}
                  >
                    <Users className="w-4 h-4 text-ink-muted shrink-0" />
                    <span className={isCollapsed ? 'md:hidden' : ''}>{t('nav.admin')}</span>
                  </button>
                )}
              </div>
            </>
          )}

          <div className={`${isCollapsed ? 'mt-3' : 'mt-6'} border-t border-line pt-2`}>
            <button
              title={isCollapsed ? t('nav.settings') : undefined}
              onClick={() => {
                onOpenSettings();
                onCloseMobile();
              }}
              className={`w-full flex rounded-lg text-left text-xs font-medium text-ink hover:bg-sand/50 hover:text-ink transition-colors cursor-pointer ${
                isCollapsed ? 'md:justify-center md:px-0 items-center gap-3 p-2.5' : 'items-center gap-3 p-2.5'
              }`}
            >
              <Settings className="w-4 h-4 text-ink-muted shrink-0" />
              <span className={isCollapsed ? 'md:hidden' : ''}>{t('nav.settings')}</span>
            </button>
          </div>
        </div>

      </aside>
    </>
  );
};
