import React, { useMemo, useState } from 'react';
import { User, NotificationItem, JobRecord } from '../../types';
import { StorageService } from '../../services/storage';
import { canViewReports } from '../../services/permissions';
import {
  Bell,
  LogOut,
  UserCheck,
  Check,
  Menu,
  FileSpreadsheet,
  Package,
  Search,
  X,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchUser: (user: User) => void;
  allUsers: User[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenReports: () => void;
  onToggleSidebar?: () => void;
  jobs: JobRecord[];
  onOpenJob: (job: JobRecord) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onSwitchUser,
  allUsers,
  activeTab,
  setActiveTab,
  onOpenReports,
  onToggleSidebar,
  jobs,
  onOpenJob,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const notifications = StorageService.getNotifications();
  const relevantNotifications = notifications.filter(
    (n) =>
      !n.targetRole ||
      n.targetRole === currentUser.role ||
      currentUser.role === 'admin' ||
      (n.targetUserId && n.targetUserId === currentUser.id)
  );

  const unreadCount = relevantNotifications.filter((n) => !n.isRead).length;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return jobs
      .filter((j) => {
        const haystack = [
          j.jobNumber,
          j.customerName,
          j.plateNumber,
          j.vehicleModel,
          j.vehicleMake,
          j.customerPhone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [query, jobs]);

  const markAllRead = () => {
    StorageService.markAllNotificationsRead(currentUser.role);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'reception':
        return 'Recorder';
      case 'finance':
        return 'Finance Officer';
      case 'manager':
        return 'Workshop Manager';
      case 'storekeeper':
        return 'Store Keeper';
      default:
        return role;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-line px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 no-print shadow-soft">
      {/* Zone 1: Brand wordmark with tablet sidebar toggle */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden touch-target flex items-center justify-center text-ink-muted hover:text-ink hover:bg-sand/60 rounded-lg cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-black text-lg shadow-soft shrink-0">
            F
          </div>
          <div className="leading-tight">
            <span className="block text-sm sm:text-base font-extrabold tracking-tight text-ink whitespace-nowrap">
              Feyamet Auto Garage
            </span>
            <span className="hidden sm:block text-[10px] font-medium text-ink-muted -mt-0.5">
              Management System
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Global search (tablet / desktop primary) */}
      <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md relative">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-ink-muted/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search jobs or plates"
            className="w-full pl-10 pr-9 py-2 text-sm bg-cream border border-line rounded-xl text-ink placeholder:text-ink-muted/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchFocused && query.trim() && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl border border-line py-1.5 z-50 max-h-80 overflow-y-auto smooth-scroll">
            {searchResults.length > 0 ? (
              searchResults.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onOpenJob(j);
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-sand/60 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">{j.customerName}</p>
                    <p className="text-[11px] text-ink-muted truncate">
                      {j.vehicleMake} {j.vehicleModel} · {j.plateNumber}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-brand shrink-0">
                    {j.jobNumber}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-ink-muted">
                No matching jobs found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Profile info, Notifications & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Admin-only staff switcher; other roles see a static profile chip */}
        {currentUser.role === 'admin' ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserSwitcher(!showUserSwitcher)}
              className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-ink bg-cream hover:bg-sand/70 rounded-xl transition cursor-pointer border border-line"
              title="Switch staff account (Admin only)"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand" />
              <span className="hidden sm:inline font-semibold">{currentUser.name}</span>
              <span className="text-[11px] text-ink-muted hidden lg:inline">
                ({getRoleDisplayName(currentUser.role)})
              </span>
            </button>

            {showUserSwitcher && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-line py-2 z-50">
                <div className="px-3 py-1.5 border-b border-line">
                  <p className="text-xs font-semibold text-ink">Switch Staff Account</p>
                  <p className="text-[11px] text-ink-muted">Admin only — test dashboard permissions</p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 smooth-scroll">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u);
                        setShowUserSwitcher(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-sand/50 transition cursor-pointer ${
                        u.id === currentUser.id ? 'bg-sand/60 text-brand font-medium' : 'text-ink'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-ink">{u.name}</p>
                        <p className="text-[10px] text-ink-muted">
                          {getRoleDisplayName(u.role)} · {u.email}
                        </p>
                      </div>
                      {u.id === currentUser.id && <Check className="w-4 h-4 text-brand" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-ink bg-cream rounded-xl border border-line">
            <UserCheck className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline font-semibold">{currentUser.name}</span>
            <span className="text-[11px] text-ink-muted hidden lg:inline">
              ({getRoleDisplayName(currentUser.role)})
            </span>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative touch-target flex items-center justify-center text-ink-muted hover:text-ink hover:bg-sand/60 rounded-xl transition cursor-pointer"
            title="In-app Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 min-w-4 h-4 px-1 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-line py-2 z-50">
              <div className="px-4 py-2 border-b border-line flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-ink">Notifications</h4>
                  <p className="text-[11px] text-ink-muted">{unreadCount} unread alerts</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-medium text-brand hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-line smooth-scroll">
                {relevantNotifications.length > 0 ? (
                  relevantNotifications.map((n: NotificationItem) => (
                    <div
                      key={n.id}
                      onClick={() => StorageService.markNotificationRead(n.id)}
                      className={`p-3 text-xs transition cursor-pointer hover:bg-sand/40 ${
                        !n.isRead ? 'bg-sand/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-ink">{n.title}</span>
                        <span className="text-[10px] text-ink-muted tabular-nums">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-ink-muted text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-ink-muted">
                    No notifications right now
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PDF Reports quick action */}
        {canViewReports(currentUser.role) && (
          <button
            type="button"
            onClick={onOpenReports}
            className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand-hover rounded-xl transition cursor-pointer shadow-soft"
            title="Open PDF & Reports Center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>
        )}

        {/* Store quick action */}
        {(currentUser.role === 'admin' || currentUser.role === 'storekeeper') && (
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer border ${
              activeTab === 'store'
                ? 'bg-brand text-white border-brand'
                : 'text-ink bg-cream hover:bg-sand/70 border-line'
            }`}
            title="Store & Tool Allocation"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Store</span>
          </button>
        )}

        {/* Log Out */}
        <button
          type="button"
          onClick={onLogout}
          className="touch-target flex items-center gap-1.5 px-2.5 text-xs font-medium text-ink-muted hover:text-white hover:bg-coral border border-line rounded-xl transition cursor-pointer"
          title="Sign out of garage system"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
