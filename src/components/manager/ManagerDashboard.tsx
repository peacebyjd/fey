import React, { useEffect, useState } from 'react';
import {
  JobRecord,
  JobStatus,
  MechanicTeam,
  User,
} from '../../types';
import { StorageService } from '../../services/storage';
import { calculateFinanceTotals } from '../../services/financeTotals';
import { PriorityBadge } from '../common/StatusBadge';
import { TeamManagementModal } from './TeamManagementModal';
import { JobAssignmentModal } from './JobAssignmentModal';
import {
  Users,
  Kanban,
  Search,
  CheckCircle2,
  Send,
  Smartphone,
  Phone,
  Database,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';

const RequirementSummary: React.FC<{ job: JobRecord; currency: string }> = ({ job, currency }) => {
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
              {item.action || 'Extra'}
            </span>
            <span className="truncate text-ink-muted">{item.name}</span>
          </span>
          <span className="font-mono text-ink-muted shrink-0">
            {item.amount > 0 ? `${item.amount.toLocaleString()} ${currency}` : '—'}
          </span>
        </div>
      ))}
      {items.length > 3 && (
        <p className="text-[10px] text-ink-muted/70">+{items.length - 3} more</p>
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
  const settings = StorageService.getSettings();
  const [teams, setTeams] = useState<MechanicTeam[]>(StorageService.getTeams());
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedJobForAssign, setSelectedJobForAssign] = useState<JobRecord | null>(null);
  const [initialTeamForModal, setInitialTeamForModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [expenses, setExpenses] = useState(() => StorageService.getExpenses());

  useEffect(() => {
    const refresh = () => setExpenses(StorageService.getExpenses());
    refresh();
    return StorageService.subscribe(refresh);
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

  // Drop onto a team column → open the simple send screen
  const handleDropOnTeam = (e: React.DragEvent, targetTeamId: string | null) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
    if (!jobId) return;
    const job = StorageService.getJobById(jobId);
    if (!job) return;

    if (targetTeamId) {
      if (!hasFinancePrice(job)) {
        toast('Finance must set the price before this job can be assigned.');
        setDraggedJobId(null);
        return;
      }

      setSelectedJobForAssign(job);
      setInitialTeamForModal(targetTeamId);
    } else {
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
    }
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
      {/* Simple header */}
      <div className="bg-white rounded-card border border-line shadow-soft p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-card bg-brand flex items-center justify-center text-white shadow-soft">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-ink">Workshop Board</h2>
            <p className="text-xs text-ink-muted">Drag a vehicle onto a team to give the job. Tap a card to see details.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenDatasArchive && (
            <button
              type="button"
              onClick={onOpenDatasArchive}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-card bg-sand/60 hover:bg-sand text-ink font-semibold text-xs border border-line cursor-pointer"
            >
              <Database className="w-4 h-4 text-brand" />
              <span>Files ({olderCompletedArchivedCount + olderUnassignedCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsTeamModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-card bg-brand hover:bg-brand-hover text-white font-semibold text-xs cursor-pointer shadow-soft"
          >
            <Users className="w-4 h-4" />
            <span>Teams ({teams.length})</span>
          </button>
        </div>
      </div>

      {notificationToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-card flex items-center gap-2 text-xs text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Simple counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-card border border-line shadow-soft">
          <p className="text-[11px] font-semibold text-ink-muted">Waiting</p>
          <p className="text-xl font-bold font-mono text-amber-700 tabular-nums">{unassignedJobsActive.length}</p>
        </div>
        <div className="p-3 bg-white rounded-card border border-line shadow-soft">
          <p className="text-[11px] font-semibold text-ink-muted">Being Fixed</p>
          <p className="text-xl font-bold font-mono text-ink tabular-nums">{inTeamsCount}</p>
        </div>
        <div className="p-3 bg-white rounded-card border border-line shadow-soft">
          <p className="text-[11px] font-semibold text-ink-muted">Done Today</p>
          <p className="text-xl font-bold font-mono text-emerald-700 tabular-nums">{completedJobsRecent.length}</p>
        </div>
        <div className="p-3 bg-white rounded-card border border-line shadow-soft">
          <p className="text-[11px] font-semibold text-ink-muted">All Files</p>
          <p className="text-xl font-bold font-mono text-brand tabular-nums">{jobs.length}</p>
        </div>
      </div>

      {/* Finance snapshot - same numbers Finance sees */}
      <div className="bg-white rounded-card border border-line shadow-soft p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-ink">Finance Overview</h3>
            <p className="text-[11px] text-ink-muted">Connected with the Finance page, all time.</p>
          </div>
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">
            All time
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Income</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-lg font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
              {money(finance.totalIncome)}
            </p>
            <p className="text-[10px] text-emerald-800/70">Collected payments</p>
          </div>
          <div className="p-3 rounded-xl bg-coral/5 border border-coral/25">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-coral uppercase tracking-wide">Expenses</span>
              <ArrowDownRight className="w-4 h-4 text-coral" />
            </div>
            <p className="text-lg font-bold font-mono text-coral tabular-nums mt-0.5">
              {money(finance.totalExpenses)}
            </p>
            <p className="text-[10px] text-coral/80">
              Salary {money(finance.salaryExpenses)} / Other {money(finance.operatingExpenses)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-sand/40 border border-line">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Net Profit</span>
              <Wallet className="w-4 h-4 text-brand" />
            </div>
            <p
              className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                finance.netProfit >= 0 ? 'text-ink' : 'text-coral'
              }`}
            >
              {money(finance.netProfit)}
            </p>
            <p className="text-[10px] text-ink-muted">Income minus expenses</p>
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
          placeholder="Search a plate, job number or mechanic"
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
        />
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
        {/* WAITING */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnTeam(e, null)}
          className="bg-amber-50/50 rounded-card p-3 border border-amber-200 min-h-[380px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-amber-950">Waiting</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold tabular-nums">
              {unassignedJobsActive.length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {unassignedJobsActive.map((job) => {
              const effectivePrice = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
              const prepared = hasFinancePrice(job);
              return (
                <div
                  key={job.id}
                  draggable={prepared}
                  onDragStart={(e) => handleDragStart(e, job.id)}
                  onClick={() => onOpenJobDetail(job)}
                  className="bg-white p-3 rounded-card border border-line shadow-soft hover:border-brand transition cursor-grab active:cursor-grabbing space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-ink">{job.jobNumber}</span>
                    <PriorityBadge priority={job.priority} />
                  </div>
                  <div className="font-bold text-base text-ink font-mono">{job.plateNumber}</div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {job.vehicleMake} {job.vehicleModel} · {job.customerName}
                  </div>
                  <div className="flex items-center justify-between text-[11px] bg-sand/50 rounded-lg px-2 py-1.5 border border-line">
                    <span className="text-ink-muted">Price</span>
                    <span className={`font-mono font-bold ${effectivePrice > 0 ? 'text-brand' : 'text-ink-muted'}`}>
                      {effectivePrice > 0 ? `${effectivePrice.toLocaleString()} ${settings.currency}` : 'Pending'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                    {job.repairDescription || job.customerProblem}
                  </p>

                  <div className="p-1.5 rounded-lg bg-sand/40 border border-line">
                    <RequirementSummary job={job} currency={settings.currency} />
                  </div>

                  <button
                    type="button"
                    disabled={!prepared}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!prepared) {
                        toast('Finance must set the price before this job can be assigned.');
                        return;
                      }
                      setSelectedJobForAssign(job);
                      setInitialTeamForModal(null);
                    }}
                    className="w-full px-3 py-2 bg-brand hover:bg-brand-hover disabled:bg-line disabled:text-ink-muted disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{prepared ? 'Give to a team' : 'Waiting for Finance price'}</span>
                  </button>
                </div>
              );
            })}

            {unassignedJobsActive.length === 0 && (
              <div className="h-36 border-2 border-dashed border-amber-200 rounded-card flex flex-col items-center justify-center text-center p-4 text-xs text-amber-800/70">
                <CheckCircle2 className="w-5 h-5 text-amber-500 mb-1" />
                <span>Nothing waiting. All cars are with a team.</span>
              </div>
            )}

            {olderUnassignedCount > 0 && onOpenDatasArchive && (
              <button
                type="button"
                onClick={onOpenDatasArchive}
                className="w-full p-2 rounded-card bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold text-center transition cursor-pointer"
              >
                {olderUnassignedCount} older in Files →
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
              className="bg-coral/10 rounded-card p-3 border border-coral/30 min-h-[380px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-ink truncate" title={team.name}>
                  {team.name}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white border border-coral/30 text-brand font-bold tabular-nums">
                  {teamJobs.length}
                </span>
              </div>
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
                      onClick={() => onOpenJobDetail(job)}
                      className="bg-white p-3 rounded-card border border-line shadow-soft hover:border-brand transition cursor-grab active:cursor-grabbing space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-ink">{job.jobNumber}</span>
                        <PriorityBadge priority={job.priority} />
                      </div>
                      <div className="font-bold text-base text-ink font-mono">{job.plateNumber}</div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {job.vehicleMake} {job.vehicleModel} · {effectivePrice.toLocaleString()} {settings.currency}
                      </div>
                      <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                        {job.repairDescription || job.customerProblem}
                      </p>

                      <div className="p-1.5 rounded-lg bg-sand/40 border border-line">
                        <RequirementSummary job={job} currency={settings.currency} />
                      </div>

                      {job.managerWarningNote && (
                        <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-900 font-medium">
                          {job.managerWarningNote}
                        </div>
                      )}

                      <div
                        className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 ${
                          smsSent ? 'text-emerald-800 bg-emerald-50' : 'text-amber-800 bg-amber-50'
                        }`}
                      >
                        {smsSent ? <Check className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        <span>{smsSent ? 'SMS sent to mechanic' : 'No SMS yet'}</span>
                      </div>

                      <div className="pt-2 border-t border-line flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={job.status}
                          onChange={(e) => handleManagerSetStatus(job, e.target.value as JobStatus)}
                          className="flex-1 px-2 py-1.5 bg-cream border border-line rounded-lg text-[11px] font-semibold text-ink cursor-pointer"
                        >
                          <option value="Ready to Start">Ready</option>
                          <option value="In Progress">Working</option>
                          <option value="Quality Check">Checking</option>
                          <option value="Completed">Done</option>
                        </select>
                        <button
                          type="button"
                          onClick={(e) => handleResendSms(e, job)}
                          title="Send the SMS again"
                          className="h-8 w-8 flex items-center justify-center bg-white border border-line hover:bg-sand rounded-lg cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-brand" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManagerSetStatus(job, 'Completed');
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg cursor-pointer"
                        >
                          Done ✓
                        </button>
                      </div>
                    </div>
                  );
                })}

                {teamJobs.length === 0 && (
                  <div className="h-36 border-2 border-dashed border-coral/30 rounded-card flex items-center justify-center text-center p-4 text-xs text-ink-muted/70">
                    Drop a vehicle here
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
          className="bg-emerald-50/50 rounded-card p-3 border border-emerald-200 min-h-[380px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-emerald-950">Done Today</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-bold tabular-nums">
              {completedJobsRecent.length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {completedJobsRecent.map((job) => (
              <div
                key={job.id}
                onClick={() => onOpenJobDetail(job)}
                className="bg-white p-3 rounded-card border border-line shadow-soft hover:border-emerald-600 transition cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-ink">{job.jobNumber}</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Done ✓
                  </span>
                </div>
                <div className="font-bold text-base text-ink font-mono">{job.plateNumber}</div>
                <div className="text-[11px] text-ink-muted truncate">
                  {job.vehicleMake} {job.vehicleModel}
                </div>
                <div className="text-[10px] text-ink-muted flex items-center justify-between">
                  <span>Payment: {job.paymentStatus}</span>
                  <span className="font-mono">
                    {(job.finalApprovedPrice || job.totalEstimatedCost).toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>
            ))}

            {completedJobsRecent.length === 0 && (
              <div className="h-36 border-2 border-dashed border-emerald-200 rounded-card flex items-center justify-center text-center p-4 text-xs text-emerald-700/60">
                Cars finished today show here
              </div>
            )}

            {olderCompletedArchivedCount > 0 && onOpenDatasArchive && (
              <button
                type="button"
                onClick={onOpenDatasArchive}
                className="w-full p-2 rounded-card bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-semibold text-center transition cursor-pointer"
              >
                {olderCompletedArchivedCount} older in Files →
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
