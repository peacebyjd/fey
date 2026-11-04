import React, { useEffect, useState } from 'react';
import {
  JobRecord,
  JobStatus,
  MechanicTeam,
  User,
} from '../../types';
import { StorageService } from '../../services/storage';
import { calculateFinanceTotals } from '../../services/financeTotals';
import { useLanguage } from '../../i18n/LanguageContext';
import { PriorityBadge } from '../common/StatusBadge';
import { TeamManagementModal } from './TeamManagementModal';
import { JobAssignmentModal } from './JobAssignmentModal';
import {
  Users,
  Search,
  CheckCircle2,
  Send,
  Smartphone,
  Phone,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Info,
  UserRound,
} from 'lucide-react';

const RequirementSummary: React.FC<{ job: JobRecord; currency: string }> = ({ job, currency }) => {
  const { t } = useLanguage();
  const items = (job.priceItems || []).filter((i) => i.name.trim());
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {items.slice(0, 3).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-1.5 text-[10px]">
          <span className="flex items-center gap-1 min-w-0">
            <span
              className={`shrink-0 px-1 py-0.5 rounded font-bold uppercase ${
                item.action === 'Replace'
                  ? 'bg-brand/10 text-brand border border-brand/30'
                  : item.action === 'Repair'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-sand text-ink-muted border border-line'
              }`}
            >
              {item.action || t('manager.extra')}
            </span>
            <span className="truncate text-ink-muted">{item.name}</span>
          </span>
          <span className="font-mono text-ink-muted shrink-0">
            {item.amount > 0 ? `${item.amount.toLocaleString()} ${currency}` : '—'}
          </span>
        </div>
      ))}
      {items.length > 3 && (
        <p className="text-[10px] text-ink-muted/70">{t('manager.more', { count: items.length - 3 })}</p>
      )}
    </div>
  );
};

interface ManagerDashboardProps {
  jobs: JobRecord[];
  currentUser: User;
  allUsers: User[];
  onOpenJobDetail: (job: JobRecord) => void;
  onRefreshJobs: () => void;
  onOpenDatasArchive?: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  jobs,
  currentUser,
  allUsers,
  onOpenJobDetail,
  onRefreshJobs,
  onOpenDatasArchive,
}) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const [teams, setTeams] = useState<MechanicTeam[]>(StorageService.getTeams());
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedJobForAssign, setSelectedJobForAssign] = useState<JobRecord | null>(null);
  const [initialTeamForModal, setInitialTeamForModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [pickedJobId, setPickedJobId] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [expenses, setExpenses] = useState(() => StorageService.getExpenses());

  useEffect(() => {
    const refresh = () => setExpenses(StorageService.getExpenses());
    refresh();
    return StorageService.subscribe(refresh);
  }, []);

  // Touch screens do not fire HTML5 drag events, so cards switch to tap-to-pick.
  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const finance = calculateFinanceTotals(jobs, expenses);
  const money = (value: number) =>
    `${settings.currency} ${Math.round(value).toLocaleString()}`;

  const now = new Date().getTime();

  const isWithinLast2Days = (job: JobRecord) => {
    const timeStr = job.receivedAt || job.createdAt;
    if (!timeStr) return true;
    const t = new Date(timeStr).getTime();
    if (isNaN(t)) return true;
    return (now - t) / (1000 * 60 * 60) <= 48;
  };

  const isCompletedWithinLast24Hours = (job: JobRecord) => {
    if (job.status !== 'Completed') return false;
    const timeStr = job.completedAt || job.updatedAt;
    if (!timeStr) return true;
    const t = new Date(timeStr).getTime();
    if (isNaN(t)) return true;
    return (now - t) / (1000 * 60 * 60) <= 24;
  };

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    return (
      job.jobNumber.toLowerCase().includes(q) ||
      job.plateNumber.toLowerCase().includes(q) ||
      job.customerName.toLowerCase().includes(q) ||
      (job.assignedMechanicName && job.assignedMechanicName.toLowerCase().includes(q)) ||
      `${job.vehicleMake} ${job.vehicleModel}`.toLowerCase().includes(q)
    );
  });

  // Cards waiting to be given to a team (from the last 2 days)
  const unassignedJobsActive = filteredJobs.filter(
    (j) => !j.assignedTeamId && j.status !== 'Completed' && j.status !== 'Cancelled' && isWithinLast2Days(j)
  );
  const olderUnassignedCount = filteredJobs.filter(
    (j) => !j.assignedTeamId && j.status !== 'Completed' && j.status !== 'Cancelled' && !isWithinLast2Days(j)
  ).length;

  const inTeamsCount = filteredJobs.filter(
    (j) => j.assignedTeamId && j.status !== 'Completed' && j.status !== 'Cancelled'
  ).length;

  // Done in the last day, later auto-moved to Files
  const completedJobsRecent = filteredJobs.filter(
    (j) => j.status === 'Completed' && isCompletedWithinLast24Hours(j)
  );
  const olderCompletedArchivedCount = filteredJobs.filter(
    (j) => j.status === 'Completed' && !isCompletedWithinLast24Hours(j)
  ).length;

  const pickedJob = pickedJobId ? jobs.find((j) => j.id === pickedJobId) || null : null;

  const handleTeamsUpdated = () => {
    setTeams(StorageService.getTeams());
    onRefreshJobs();
  };

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('text/plain', jobId);
    setDraggedJobId(jobId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  const hasFinancePrice = (job: JobRecord) =>
    (job.finalApprovedPrice || 0) > 0 || (job.totalEstimatedCost || 0) > 0;

  // Shared by drag-and-drop and by the tablet tap-to-send controls
  const moveJobToTeam = (jobId: string, targetTeamId: string | null) => {
    const job = StorageService.getJobById(jobId);
    if (!job) return;

    if (targetTeamId) {
      if (!hasFinancePrice(job)) {
        toast(t('manager.financeMustSetPrice'));
        return;
      }

      setSelectedJobForAssign(job);
      setInitialTeamForModal(targetTeamId);
      return;
    }

    const updatedJob: JobRecord = {
      ...job,
      assignedTeamId: null,
      assignedTeamName: null,
      assignedMechanicName: null,
      assignedMechanicPhone: null,
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Job Unassigned',
          performedBy: currentUser.name,
          userRole: currentUser.role,
          details: 'Vehicle moved back to the waiting list.',
          type: 'assignment',
        },
        ...(job.auditTrail || []),
      ],
    };
    StorageService.saveJob(updatedJob);
    onRefreshJobs();
    toast(`Job ${job.jobNumber} moved back to Waiting.`);
  };

  // Drop onto a team column → open the simple send screen
  const handleDropOnTeam = (e: React.DragEvent, targetTeamId: string | null) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
    if (jobId) moveJobToTeam(jobId, targetTeamId);
    setDraggedJobId(null);
  };

  const handleDropOnCompleted = (e: React.DragEvent) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
    if (!jobId) return;
    const job = StorageService.getJobById(jobId);
    if (!job) return;
    handleManagerSetStatus(job, 'Completed');
    setDraggedJobId(null);
  };

  const handleManagerSetStatus = (job: JobRecord, nextStatus: JobStatus) => {
    const isCompleted = nextStatus === 'Completed';
    const updated: JobRecord = {
      ...job,
      status: nextStatus,
      completedAt: isCompleted ? new Date().toISOString() : job.completedAt,
      updatedAt: new Date().toISOString(),
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: `Manager Set Status: ${nextStatus}`,
          performedBy: currentUser.name,
          userRole: currentUser.role,
          details: `Status changed to ${nextStatus} for ${job.plateNumber}.`,
          type: 'status',
        },
        ...(job.auditTrail || []),
      ],
    };
    StorageService.saveJob(updated);
    onRefreshJobs();
    toast(isCompleted ? `Vehicle ${job.plateNumber} is Done.` : `Vehicle ${job.plateNumber} is now ${nextStatus}.`);
  };

  const togglePick = (jobId: string) => {
    setPickedJobId((current) => (current === jobId ? null : jobId));
  };

  const sendPickedTo = (teamId: string | null) => {
    if (!pickedJobId) return;
    moveJobToTeam(pickedJobId, teamId);
    setPickedJobId(null);
  };

  const completePicked = () => {
    if (!pickedJob) return;
    handleManagerSetStatus(pickedJob, 'Completed');
    setPickedJobId(null);
  };

  const handleResendSms = (e: React.MouseEvent, job: JobRecord) => {
    e.stopPropagation();
    if (!job.assignedMechanicPhone) {
      setSelectedJobForAssign(job);
      return;
    }
    StorageService.dispatchTaskSms(
      job.id,
      job.assignedMechanicName || 'Mechanic',
      job.assignedMechanicPhone,
      currentUser.name
    );
    onRefreshJobs();
    toast(`SMS sent again to ${job.assignedMechanicName}.`);
  };

  return (
    <div className="space-y-4">
      {/* One slim strip: live counts + team management, no separate header card */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-line text-[11px] font-semibold text-ink-muted">
          {t('manager.waiting')}
          <b className="font-mono text-amber-700 tabular-nums">{unassignedJobsActive.length}</b>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-line text-[11px] font-semibold text-ink-muted">
          {t('manager.beingFixed')}
          <b className="font-mono text-ink tabular-nums">{inTeamsCount}</b>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-line text-[11px] font-semibold text-ink-muted">
          {t('manager.doneToday')}
          <b className="font-mono text-emerald-700 tabular-nums">{completedJobsRecent.length}</b>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-line text-[11px] font-semibold text-ink-muted">
          {t('manager.allFiles')}
          <b className="font-mono text-brand tabular-nums">{jobs.length}</b>
        </span>
        <button
          type="button"
          onClick={() => setIsTeamModalOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sand/60 hover:bg-sand text-ink font-semibold text-[11px] border border-line cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-brand" />
          <span>{t('manager.manageTeams')}</span>
          <span className="font-mono text-[10px] px-1.5 rounded bg-white border border-line text-ink-muted tabular-nums">
            {teams.length}
          </span>
        </button>
      </div>

      {notificationToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-card flex items-center gap-2 text-xs text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Finance snapshot - same numbers Finance sees */}
      <div className="bg-white rounded-card border border-line shadow-soft p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-ink">{t('manager.financeOverview')}</h3>
            <p className="text-[11px] text-ink-muted">{t('manager.financeOverviewDesc')}</p>
          </div>
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">
            {t('manager.allTime')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                {t('manager.income')}
              </span>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-700 tabular-nums leading-tight">
              {money(finance.totalIncome)}
            </p>
            <p className="text-[10px] text-emerald-800/70">{t('manager.collectedPayments')}</p>
          </div>
          <div className="p-3 rounded-xl bg-white border border-coral/25 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-coral/10 text-coral flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] font-bold text-coral uppercase tracking-wide">
                {t('manager.expenses')}
              </span>
            </div>
            <p className="text-xl font-bold font-mono text-coral tabular-nums leading-tight">
              {money(finance.totalExpenses)}
            </p>
            <p className="text-[10px] text-coral/80 leading-snug">
              {t('manager.salaryOther', {
                salary: money(finance.salaryExpenses),
                other: money(finance.operatingExpenses),
              })}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-sand/40 border border-line flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-white border border-line text-brand flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">
                {t('manager.netProfit')}
              </span>
            </div>
            <p
              className={`text-xl font-bold font-mono tabular-nums leading-tight ${
                finance.netProfit >= 0 ? 'text-ink' : 'text-coral'
              }`}
            >
              {money(finance.netProfit)}
            </p>
            <p className="text-[10px] text-ink-muted">{t('manager.incomeMinusExpenses')}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted/70" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('manager.searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
        />
      </div>

      {pickedJob && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-card bg-brand/10 border border-brand/30 text-xs font-semibold text-ink">
          <Info className="w-4 h-4 text-brand shrink-0" />
          <span className="flex-1 min-w-0 truncate">
            {t('manager.pickedHint', { plate: pickedJob.plateNumber })}
          </span>
          <button
            type="button"
            onClick={() => setPickedJobId(null)}
            className="shrink-0 px-2 py-1 rounded-lg bg-white border border-line text-[11px] font-semibold cursor-pointer"
          >
            {t('manager.cancelPick')}
          </button>
        </div>
      )}

      {/* Board: readable horizontal columns on tablets, a four-column board on desktop */}
      <div className="grid grid-cols-1 gap-3 md:-mx-1 md:flex md:items-start md:gap-3 md:overflow-x-auto md:smooth-scroll md:px-1 md:pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0">
        {/* WAITING */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnTeam(e, null)}
          className="md:snap-start md:shrink-0 md:w-[320px] lg:w-auto bg-amber-50/60 rounded-card p-3 border border-amber-200 min-h-[320px] lg:min-h-[380px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-amber-950">{t('manager.waiting')}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold tabular-nums">
              {unassignedJobsActive.length}
            </span>
          </div>

          {pickedJob && (
            <button
              type="button"
              onClick={() => sendPickedTo(null)}
              className="mb-2 w-full py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              {t('manager.sendHere')}
            </button>
          )}

          <div className="space-y-2.5 flex-1">
            {unassignedJobsActive.map((job) => {
              const effectivePrice = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
              const prepared = hasFinancePrice(job);
              return (
                <div
                  key={job.id}
                  draggable={prepared}
                  onDragStart={(e) => handleDragStart(e, job.id)}
                  onClick={() => (isTouch ? togglePick(job.id) : onOpenJobDetail(job))}
                  className={`bg-white rounded-card border shadow-soft transition cursor-grab active:cursor-grabbing overflow-hidden ${
                    pickedJobId === job.id
                      ? 'border-brand ring-2 ring-brand/40'
                      : 'border-line hover:border-brand/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-sand/30 border-b border-line/70">
                    <span className="font-mono text-[11px] font-bold text-ink-muted">
                      {job.jobNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={job.priority} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenJobDetail(job);
                        }}
                        title={t('manager.viewDetails')}
                        aria-label={t('manager.viewDetails')}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted/70 hover:text-ink hover:bg-sand/60 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[17px] font-bold leading-tight text-ink">
                        {job.plateNumber}
                      </p>
                      <p className="text-[11px] text-ink-muted truncate mt-0.5">
                        {job.vehicleMake} {job.vehicleModel}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-ink-muted min-w-0">
                      <UserRound className="w-3.5 h-3.5 shrink-0 text-ink-muted/70" />
                      <span className="truncate">{job.customerName}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg bg-sand/50 border border-line px-2 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                        {t('manager.price')}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold whitespace-nowrap ${
                          effectivePrice > 0 ? 'text-brand' : 'text-ink-muted'
                        }`}
                      >
                        {effectivePrice > 0
                          ? `${effectivePrice.toLocaleString()} ${settings.currency}`
                          : t('manager.pending')}
                      </span>
                    </div>

                    <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                      {job.repairDescription || job.customerProblem}
                    </p>

                    {(job.priceItems || []).some((item) => item.name.trim()) && (
                      <div className="rounded-lg bg-sand/40 border border-line px-2 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted mb-1">
                          {t('manager.partsLabor')}
                        </p>
                        <RequirementSummary job={job} currency={settings.currency} />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!prepared}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!prepared) {
                          toast(t('manager.financeMustSetPrice'));
                          return;
                        }
                        setSelectedJobForAssign(job);
                        setInitialTeamForModal(null);
                      }}
                      className="w-full min-h-10 px-3 py-2 bg-brand hover:bg-brand-hover disabled:bg-line disabled:text-ink-muted disabled:cursor-not-allowed text-white rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{prepared ? t('manager.giveToTeam') : t('manager.waitingFinance')}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {unassignedJobsActive.length === 0 && (
              <div className="h-36 border-2 border-dashed border-amber-200 rounded-card flex flex-col items-center justify-center text-center p-4 text-xs text-amber-800/70">
                <CheckCircle2 className="w-5 h-5 text-amber-500 mb-1" />
                <span>{t('manager.nothingWaiting')}</span>
              </div>
            )}

            {olderUnassignedCount > 0 && onOpenDatasArchive && (
              <button
                type="button"
                onClick={onOpenDatasArchive}
                className="w-full p-2 rounded-card bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold text-center transition cursor-pointer"
              >
                {t('manager.olderInFiles', { count: olderUnassignedCount })} →
              </button>
            )}
          </div>
        </div>

        {/* TEAM COLUMNS */}
        {teams.map((team) => {
          const teamJobs = filteredJobs.filter(
            (j) => j.assignedTeamId === team.id && j.status !== 'Completed' && j.status !== 'Cancelled'
          );
          return (
            <div
              key={team.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnTeam(e, team.id)}
              className="md:snap-start md:shrink-0 md:w-[320px] lg:w-auto bg-coral/10 rounded-card p-3 border border-coral/30 min-h-[320px] lg:min-h-[380px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-ink truncate" title={team.name}>
                  {team.name}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white border border-coral/30 text-brand font-bold tabular-nums">
                  {teamJobs.length}
                </span>
              </div>
              {pickedJob && (
                <button
                  type="button"
                  onClick={() => sendPickedTo(team.id)}
                  className="mb-2 w-full py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  {t('manager.sendHere')}
                </button>
              )}
              <div className="text-[10px] text-ink-muted mb-2 flex items-center gap-1">
                <Phone className="w-3 h-3 text-brand" />
                <span>{team.leadMechanicName} · {team.leadMechanicPhone}</span>
              </div>

              <div className="space-y-2.5 flex-1">
                {teamJobs.map((job) => {
                  const effectivePrice = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
                  const smsSent = job.smsDispatches && job.smsDispatches.length > 0;
                  return (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onClick={() => (isTouch ? togglePick(job.id) : onOpenJobDetail(job))}
                      className={`bg-white rounded-card border shadow-soft transition cursor-grab active:cursor-grabbing overflow-hidden ${
                        pickedJobId === job.id
                          ? 'border-brand ring-2 ring-brand/40'
                          : 'border-line hover:border-brand/50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-sand/30 border-b border-line/70">
                        <span className="font-mono text-[11px] font-bold text-ink-muted">
                          {job.jobNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={job.priority} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenJobDetail(job);
                            }}
                            title={t('manager.viewDetails')}
                            aria-label={t('manager.viewDetails')}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted/70 hover:text-ink hover:bg-sand/60 cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 space-y-2.5">
                        <div className="min-w-0">
                          <p className="font-mono text-[17px] font-bold leading-tight text-ink">
                            {job.plateNumber}
                          </p>
                          <p className="text-[11px] text-ink-muted truncate mt-0.5">
                            {job.vehicleMake} {job.vehicleModel}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 rounded-lg bg-sand/50 border border-line px-2 py-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                            {t('manager.price')}
                          </span>
                          <span className="font-mono text-xs font-bold text-brand whitespace-nowrap">
                            {effectivePrice.toLocaleString()} {settings.currency}
                          </span>
                        </div>

                        <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                          {job.repairDescription || job.customerProblem}
                        </p>

                        {(job.priceItems || []).some((item) => item.name.trim()) && (
                          <div className="rounded-lg bg-sand/40 border border-line px-2 py-1.5">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted mb-1">
                              {t('manager.partsLabor')}
                            </p>
                            <RequirementSummary job={job} currency={settings.currency} />
                          </div>
                        )}

                        {job.managerWarningNote && (
                          <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-900 font-medium">
                            {job.managerWarningNote}
                          </div>
                        )}

                        <div
                          className={`text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 ${
                            smsSent ? 'text-emerald-800 bg-emerald-50' : 'text-amber-800 bg-amber-50'
                          }`}
                        >
                          {smsSent ? <Check className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                          <span>{smsSent ? t('manager.smsSent') : t('manager.noSms')}</span>
                        </div>

                        <div
                          className="pt-2 border-t border-line space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={job.status}
                            onChange={(e) => handleManagerSetStatus(job, e.target.value as JobStatus)}
                            className="w-full min-h-9 px-2 py-1.5 bg-cream border border-line rounded-lg text-[11px] font-semibold text-ink cursor-pointer"
                          >
                            <option value="Ready to Start">{t('manager.ready')}</option>
                            <option value="In Progress">{t('manager.working')}</option>
                            <option value="Quality Check">{t('manager.checking')}</option>
                            <option value="Completed">{t('manager.done')}</option>
                          </select>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleResendSms(e, job)}
                              title={t('manager.resendSms')}
                              className="min-h-9 flex items-center justify-center gap-1.5 bg-white border border-line hover:bg-sand rounded-lg text-[11px] font-semibold text-ink cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-brand shrink-0" />
                              <span className="truncate">{t('manager.sms')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManagerSetStatus(job, 'Completed');
                              }}
                              className="min-h-9 flex items-center justify-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              {t('manager.done')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {teamJobs.length === 0 && (
                  <div className="h-36 border-2 border-dashed border-coral/30 rounded-card flex items-center justify-center text-center p-4 text-xs text-ink-muted/70">
                    {t('manager.dropVehicle')}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* DONE TODAY */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnCompleted}
          className="md:snap-start md:shrink-0 md:w-[320px] lg:w-auto bg-emerald-50/50 rounded-card p-3 border border-emerald-200 min-h-[320px] lg:min-h-[380px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-emerald-950">{t('manager.doneToday')}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-bold tabular-nums">
              {completedJobsRecent.length}
            </span>
          </div>

          {pickedJob && (
            <button
              type="button"
              onClick={completePicked}
              className="mb-2 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              {t('manager.sendHere')}
            </button>
          )}

          <div className="space-y-2.5 flex-1">
            {completedJobsRecent.map((job) => (
              <div
                key={job.id}
                onClick={() => onOpenJobDetail(job)}
                className="bg-white rounded-card border border-line shadow-soft hover:border-emerald-600 hover:shadow-md transition cursor-pointer overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50/70 border-b border-emerald-100">
                  <span className="font-mono text-[11px] font-bold text-ink-muted">
                    {job.jobNumber}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                    {t('manager.done')} ✓
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-mono text-[17px] font-bold leading-tight text-ink">
                    {job.plateNumber}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {job.vehicleMake} {job.vehicleModel}
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-sand/40 border border-line px-2 py-1.5 text-[10px] text-ink-muted">
                    <span className="truncate">
                      {t('manager.payment')}: {job.paymentStatus}
                    </span>
                    <span className="font-mono font-bold text-ink whitespace-nowrap">
                      {(job.finalApprovedPrice || job.totalEstimatedCost).toLocaleString()}{' '}
                      {settings.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {completedJobsRecent.length === 0 && (
              <div className="h-36 border-2 border-dashed border-emerald-200 rounded-card flex items-center justify-center text-center p-4 text-xs text-emerald-700/60">
                {t('manager.carsFinishedToday')}
              </div>
            )}

            {olderCompletedArchivedCount > 0 && onOpenDatasArchive && (
              <button
                type="button"
                onClick={onOpenDatasArchive}
                className="w-full p-2 rounded-card bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-semibold text-center transition cursor-pointer"
              >
                {t('manager.olderInFiles', { count: olderCompletedArchivedCount })} →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Team Management Modal */}
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teams={teams}
        allUsers={allUsers}
        onTeamsUpdated={handleTeamsUpdated}
      />

      {/* Job Assignment & SMS Modal */}
      {selectedJobForAssign && (
        <JobAssignmentModal
          job={selectedJobForAssign}
          isOpen={true}
          initialTeamId={initialTeamForModal}
          onClose={() => {
            setSelectedJobForAssign(null);
            setInitialTeamForModal(null);
          }}
          teams={teams}
          currentUser={currentUser}
          onJobUpdated={() => {
            onRefreshJobs();
            setSelectedJobForAssign(null);
            setInitialTeamForModal(null);
          }}
        />
      )}
    </div>
  );
};
