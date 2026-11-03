import React, { useEffect, useMemo, useState } from 'react';
import {
  SalaryEntry,
  SalaryProfile,
  SalaryWeek,
  User,
  WORKER_CATEGORIES,
  WorkerCategory,
} from '../../types';
import { StorageService } from '../../services/storage';
import { canManagePricing } from '../../services/permissions';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  formatDateShort,
  formatWeekRange,
  paydayForWeekStart,
} from '../../services/payroll';
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  History,
  Plus,
  Settings2,
  Users,
  Wallet,
  X,
} from 'lucide-react';

interface SalaryPageProps {
  currentUser: User;
}

const categoryBadge = (category: WorkerCategory) => {
  if (category === 'Body') return 'bg-amber-100 text-amber-800 border-amber-300';
  if (category === 'Electrical') return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  return 'bg-sky-50 text-sky-800 border-sky-300';
};

export const SalaryPage: React.FC<SalaryPageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const canManage = canManagePricing(currentUser.role);

  const [week, setWeek] = useState<SalaryWeek | null>(null);
  const [weeks, setWeeks] = useState<SalaryWeek[]>([]);
  const [profiles, setProfiles] = useState<SalaryProfile[]>([]);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<'All' | WorkerCategory>('All');
  const [notice, setNotice] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);

  const refresh = () => {
    const current = StorageService.ensureCurrentSalaryWeek();
    setWeek(current);
    setWeeks(StorageService.getSalaryWeeks());
    setProfiles(StorageService.getSalaryProfiles());
    setAmountDrafts(
      Object.fromEntries(current.entries.map((entry) => [entry.id, String(entry.amount)]))
    );
  };

  useEffect(() => {
    refresh();
    return StorageService.subscribe(refresh);
  }, []);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  };

  const entries = useMemo(() => {
    if (!week) return [];
    if (categoryFilter === 'All') return week.entries;
    return week.entries.filter((entry) => entry.category === categoryFilter);
  }, [week, categoryFilter]);

  const totalPayroll = (week?.entries || []).reduce((sum, entry) => sum + entry.amount, 0);
  const totalPaid = (week?.entries || [])
    .filter((entry) => entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalUnpaid = totalPayroll - totalPaid;
  const paidCount = (week?.entries || []).filter((entry) => entry.paid).length;
  const closedWeeks = weeks
    .filter((item) => item.status === 'Closed')
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const money = (value: number) =>
    `${settings.currency} ${Math.round(value).toLocaleString()}`;

  const commitAmount = (entry: SalaryEntry) => {
    if (!week || entry.paid) return;
    const raw = amountDrafts[entry.id];
    const value = Number(raw);
    if (raw === '' || Number.isNaN(value)) {
      setAmountDrafts((prev) => ({ ...prev, [entry.id]: String(entry.amount) }));
      return;
    }
    if (value === entry.amount) return;
    if (StorageService.updateSalaryEntryAmount(week.id, entry.id, value)) {
      flash(`${entry.workerName} amount set to ${money(value)} for this week.`);
    }
  };

  const handleTogglePaid = (entry: SalaryEntry, paid: boolean) => {
    if (!week) return;
    commitAmount(entry);
    const success = StorageService.setSalaryEntryPaid(
      week.id,
      entry.id,
      paid,
      currentUser.name
    );
    if (success) {
      flash(
        paid
          ? `${entry.workerName} marked paid. ${money(entry.amount)} salary expense recorded.`
          : `${entry.workerName} payment reversed and salary expense removed.`
      );
    }
  };

  if (!week) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-line rounded-2xl">
        {t('salary.preparing')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-ink">{t('salary.title')}</h2>
                <p className="text-[11px] text-ink-muted">
                  {t('salary.description', { currency: settings.currency })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sand/50 border border-line text-[11px] font-semibold text-ink">
              <CalendarDays className="w-3.5 h-3.5 text-brand" />
              {formatWeekRange(week.weekStart)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-coral/10 border border-coral/30 text-[11px] font-semibold text-brand">
              {t('salary.payday', { date: formatDateShort(paydayForWeekStart(week.weekStart)) })}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowManage(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Manage workers
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
          <div className="p-3 rounded-xl bg-sand/40 border border-line">
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Workers</p>
            <p className="text-lg font-bold text-ink tabular-nums">{week.entries.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-sand/40 border border-line">
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Weekly payroll</p>
            <p className="text-lg font-bold text-ink tabular-nums">{money(totalPayroll)}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">Paid</p>
            <p className="text-lg font-bold text-emerald-800 tabular-nums">{money(totalPaid)}</p>
          </div>
          <div className="p-3 rounded-xl bg-coral/10 border border-coral/30">
            <p className="text-[10px] font-semibold text-brand uppercase tracking-wide">Remaining</p>
            <p className="text-lg font-bold text-brand tabular-nums">{money(totalUnpaid)}</p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {notice}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold bg-white p-2.5 rounded-xl border border-line">
        {(['All', ...WORKER_CATEGORIES] as const).map((category) => {
          const count =
            category === 'All'
              ? week.entries.length
              : week.entries.filter((entry) => entry.category === category).length;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === category
                  ? 'bg-brand text-white'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span>{category === 'All' ? 'All departments' : category}</span>
              <span
                className={`px-1.5 rounded-full text-[10px] font-mono ${
                  categoryFilter === category ? 'bg-white/20' : 'bg-sand'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
        <span className="ml-auto pr-1 text-[10px] text-ink-muted hidden sm:inline">
          {paidCount} of {week.entries.length} paid
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-sand/50 border-b border-line text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          <span className="col-span-4">Worker</span>
          <span className="col-span-2">Department</span>
          <span className="col-span-2 text-right">Base salary</span>
          <span className="col-span-2 text-right">This week ({settings.currency})</span>
          <span className="col-span-2 text-right">Paid</span>
        </div>

        <div className="divide-y divide-line">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-2 px-4 py-3 items-center ${
                entry.paid ? 'bg-emerald-50/40' : ''
              }`}
            >
              <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-full bg-sand text-brand font-bold text-[11px] flex items-center justify-center shrink-0">
                  {entry.workerName
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate">{entry.workerName}</p>
                  <p className="text-[10px] text-ink-muted">
                    {entry.carriedIn > 0
                      ? `Includes ${money(entry.carriedIn)} carried unpaid`
                      : entry.paid
                      ? `Paid ${entry.paidAt ? new Date(entry.paidAt).toLocaleDateString('en-GB') : ''}`
                      : 'Not paid yet'}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${categoryBadge(
                    entry.category
                  )}`}
                >
                  {entry.category}
                </span>
              </div>

              <div className="md:col-span-2 text-left md:text-right font-mono text-xs text-ink-muted">
                <span className="md:hidden text-[10px] font-sans font-semibold mr-1">Base:</span>
                {money(entry.baseSalary)}
              </div>

              <div className="md:col-span-2 md:text-right">
                <div className="relative inline-flex items-center w-full md:w-auto">
                  <span className="absolute left-2 text-[10px] font-bold text-ink-muted pointer-events-none">
                    {settings.currency}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!canManage || entry.paid}
                    value={amountDrafts[entry.id] ?? String(entry.amount)}
                    onChange={(event) =>
                      setAmountDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))
                    }
                    onBlur={() => commitAmount(entry)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                    }}
                    className="w-full md:w-32 pl-9 pr-2 py-2 text-xs font-mono font-bold text-ink bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex items-center md:justify-end">
                <label
                  className={`inline-flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] font-bold select-none ${
                    entry.paid
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-ink border-line'
                  } ${canManage ? 'cursor-pointer' : 'opacity-60'}`}
                >
                  <input
                    type="checkbox"
                    checked={entry.paid}
                    disabled={!canManage}
                    onChange={(event) => handleTogglePaid(entry, event.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  {entry.paid ? 'Paid' : 'Mark paid'}
                </label>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="p-8 text-center text-xs text-ink-muted">
              <Users className="w-7 h-7 mx-auto text-line mb-2" />
              No workers in this department yet.
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-ink-muted flex items-start gap-2 bg-sand/30 border border-line rounded-xl px-3 py-2">
        <BadgeCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <span>
          Every tick records a salary expense immediately. Unpaid amounts are carried into the
          next Saturday&apos;s week automatically.
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center gap-2">
          <History className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-bold text-ink">Past salary weeks</h3>
          <span className="text-[10px] text-ink-muted">({closedWeeks.length} archived)</span>
        </div>
        {closedWeeks.length === 0 ? (
          <p className="p-5 text-center text-xs text-ink-muted">
            This is the first salary week. Closed weeks will be stored here automatically.
          </p>
        ) : (
          <div className="divide-y divide-line max-h-[420px] overflow-y-auto smooth-scroll">
            {closedWeeks.map((closed) => {
              const paid = closed.entries.filter((entry) => entry.paid);
              const paidAmount = paid.reduce((sum, entry) => sum + entry.amount, 0);
              return (
                <details key={closed.id} className="group">
                  <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-3 list-none">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-ink-muted group-open:rotate-180 transition" />
                      <div>
                        <p className="text-xs font-bold text-ink">
                          {formatWeekRange(closed.weekStart)}
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          {paid.length}/{closed.entries.length} paid · archived
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-ink">
                      {money(paidAmount)}
                    </span>
                  </summary>
                  <div className="px-4 pb-3 pt-1 space-y-1.5 bg-sand/20">
                    {closed.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 text-[11px] bg-white border border-line rounded-lg px-2.5 py-1.5"
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-ink truncate">{entry.workerName}</span>
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${categoryBadge(entry.category)}`}>
                            {entry.category}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold">{money(entry.amount)}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              entry.paid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-coral/10 text-brand'
                            }`}
                          >
                            {entry.paid ? 'Paid' : 'Unpaid carried'}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {showManage && (
        <WorkerManagerModal
          profiles={profiles}
          onClose={() => setShowManage(false)}
          onChanged={refresh}
        />
      )}
    </div>
  );
};

const WorkerManagerModal: React.FC<{
  profiles: SalaryProfile[];
  onClose: () => void;
  onChanged: () => void;
}> = ({ profiles, onClose, onChanged }) => {
  const settings = StorageService.getSettings();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WorkerCategory>('Mechanic');
  const [salary, setSalary] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) {
      setError('Enter the worker name.');
      return;
    }
    const created = StorageService.addSalaryWorker(name, category, Number(salary) || 0);
    if (!created) {
      setError('Could not add worker.');
      return;
    }
    setName('');
    setSalary('');
    setError(null);
    onChanged();
  };

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl border border-line max-h-[92vh] flex flex-col">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Workers & base salary</h3>
            <p className="text-[11px] text-ink-muted">
              Base salary is used each new week. Finance can still adjust the weekly amount.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          <div className="rounded-xl border border-line overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-sand/50 text-[10px] font-bold uppercase text-ink-muted">
              <span className="col-span-5">Worker</span>
              <span className="col-span-3">Department</span>
              <span className="col-span-3 text-right">Base / week</span>
              <span className="col-span-1" />
            </div>
            <div className="divide-y divide-line">
              {profiles.map((profile) => (
                <div key={profile.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                  <div className="col-span-5 min-w-0">
                    <input
                      defaultValue={profile.workerName}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value && value !== profile.workerName) {
                          StorageService.updateSalaryProfile(profile.id, { workerName: value });
                          onChanged();
                        }
                      }}
                      className="w-full px-2 py-1.5 text-xs font-semibold bg-cream border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    {!profile.active && (
                      <span className="text-[9px] text-coral font-bold uppercase">Inactive</span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <select
                      value={profile.category}
                      onChange={(event) => {
                        StorageService.updateSalaryProfile(profile.id, {
                          category: event.target.value as WorkerCategory,
                        });
                        onChanged();
                      }}
                      className="w-full px-1.5 py-1.5 text-[11px] bg-cream border border-line rounded-lg"
                    >
                      {WORKER_CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      key={`${profile.id}-${profile.weeklySalary}`}
                      type="number"
                      min={0}
                      defaultValue={profile.weeklySalary}
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (!Number.isNaN(value) && value !== profile.weeklySalary) {
                          StorageService.updateSalaryProfile(profile.id, { weeklySalary: value });
                          onChanged();
                        }
                      }}
                      className="w-full px-2 py-1.5 text-xs font-mono font-bold text-right bg-cream border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        StorageService.setSalaryWorkerActive(profile.id, !profile.active);
                        onChanged();
                      }}
                      className={`px-1.5 py-1 rounded text-[9px] font-bold border cursor-pointer ${
                        profile.active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-sand text-ink-muted border-line'
                      }`}
                      title={profile.active ? 'Set inactive' : 'Set active'}
                    >
                      {profile.active ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-coral bg-coral/10 border border-coral/30 rounded-lg px-2.5 py-1.5">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-line p-3 bg-sand/20">
            <p className="text-[11px] font-bold text-ink mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-brand" /> Add worker
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Worker name"
                className="sm:col-span-2 px-2.5 py-2 text-xs bg-white border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as WorkerCategory)}
                className="px-2 py-2 text-xs bg-white border border-line rounded-lg"
              >
                {WORKER_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={salary}
                  onChange={(event) => setSalary(event.target.value)}
                  placeholder={`${settings.currency}/week`}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-3 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-line flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
