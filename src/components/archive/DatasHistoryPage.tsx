import React, { useState } from 'react';
import { JobRecord, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { DocumentShareButton } from '../common/DocumentShareButton';
import { StatusBadge } from '../common/StatusBadge';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Search,
  Download,
  Upload,
  Printer,
  Car,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface DatasHistoryPageProps {
  jobs: JobRecord[];
  currentUser: User;
  onOpenJobDetail: (job: JobRecord) => void;
  onRefreshJobs: () => void;
  onBackToManager?: () => void;
}

export const DatasHistoryPage: React.FC<DatasHistoryPageProps> = ({
  jobs,
  currentUser,
  onOpenJobDetail,
  onRefreshJobs,
  onBackToManager,
}) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'finished' | 'waiting'>('all');
  const [datePreset, setDatePreset] = useState<'all' | '2months' | '30days' | '14days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-31');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const now = new Date().getTime();

  const matchesDateFilter = (job: JobRecord) => {
    if (datePreset === 'all') return true;
    const timeStr = job.receivedAt || job.createdAt || job.completedAt;
    if (!timeStr) return true;
    const dateOnly = timeStr.substring(0, 10);
    const jobTime = new Date(`${dateOnly}T12:00:00`).getTime();
    if (isNaN(jobTime)) return true;

    if (datePreset === '2months') return now - jobTime <= 65 * 24 * 60 * 60 * 1000;
    if (datePreset === '30days') return now - jobTime <= 30 * 24 * 60 * 60 * 1000;
    if (datePreset === '14days') return now - jobTime <= 14 * 24 * 60 * 60 * 1000;
    if (datePreset === 'custom') {
      const start = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59`).getTime() : Infinity;
      return jobTime >= start && jobTime <= end;
    }
    return true;
  };

  const finishedJobs = jobs.filter((j) => j.status === 'Completed');
  const waitingJobs = jobs.filter(
    (j) => !j.assignedTeamId && j.status !== 'Completed' && j.status !== 'Cancelled'
  );

  const totalRevenue = jobs.reduce((sum, j) => {
    const val = j.finalApprovedPrice > 0 ? j.finalApprovedPrice : j.totalEstimatedCost;
    return sum + (val || 0);
  }, 0);

  const filteredList = jobs
    .filter((job) => {
      if (!matchesDateFilter(job)) return false;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        job.jobNumber.toLowerCase().includes(q) ||
        job.plateNumber.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        job.customerPhone.toLowerCase().includes(q) ||
        `${job.vehicleMake} ${job.vehicleModel}`.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (category === 'finished') return job.status === 'Completed';
      if (category === 'waiting')
        return !job.assignedTeamId && job.status !== 'Completed' && job.status !== 'Cancelled';
      return true;
    })
    .sort((a, b) => (b.receivedAt || '').localeCompare(a.receivedAt || ''));

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feyamet-garage-backup-${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importBackup(content);
      if (res.success) {
        onRefreshJobs();
        showToast('Backup restored.');
      } else {
        alert(`Failed to restore backup: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReloadSampleData = () => {
    StorageService.resetTo2MonthsSampleData();
    onRefreshJobs();
    showToast('Sample records loaded.');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">{t('data.title')}</h1>
          <p className="text-xs sm:text-sm text-ink-muted">{t('data.description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-line text-[11px]">
            <span className="text-ink-muted font-medium">{t('data.revenue')}</span>
            <b className="font-mono text-ink tabular-nums">
              {totalRevenue.toLocaleString()} {settings.currency}
            </b>
          </span>
          {onBackToManager && (
            <button
              type="button"
              onClick={onBackToManager}
              className="px-3.5 py-2 rounded-xl bg-sand/60 hover:bg-sand text-ink font-semibold text-xs border border-line cursor-pointer"
            >
              {t('data.backToBoard')}
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-sm text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-line shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: t('data.all'), count: jobs.length },
            { id: 'finished', label: t('data.finished'), count: finishedJobs.length },
            { id: 'waiting', label: t('data.waiting'), count: waitingJobs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id as typeof category)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                category === tab.id ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 rounded-full text-[10px] font-mono ${
                  category === tab.id ? 'bg-white/20' : 'bg-sand'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as typeof datePreset)}
            className="px-2.5 py-2 text-xs border border-line rounded-lg bg-white text-ink font-medium focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            <option value="all">{t('data.allTime')}</option>
            <option value="2months">{t('data.past2months')}</option>
            <option value="30days">{t('data.past30')}</option>
            <option value="14days">{t('data.past14')}</option>
            <option value="custom">{t('data.custom')}</option>
          </select>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1.5 text-xs border border-line rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <span className="text-ink-muted text-xs">{t('data.to')}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1.5 text-xs border border-line rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          )}

          <div className="relative sm:min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-muted/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('data.search')}
              className="w-full pl-8 pr-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-2xl border border-line overflow-hidden shadow-2xs">
        <div className="p-3.5 border-b border-line bg-sand/40 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            {t('data.records', { count: filteredList.length })}
          </span>
          <div className="flex items-center gap-1.5">
            <DocumentShareButton
              title={t('data.printPdf')}
              text={`${t('data.printPdf')} · ${filteredList.length}\n${settings.garageName} · ${settings.phone}`}
              getPdf={() => PdfService.generateDailySummaryPdf(filteredList, settings, { download: false })}
            />
            <button
              type="button"
              onClick={() => PdfService.generateDailySummaryPdf(filteredList, settings)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/40 rounded-lg cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('data.printPdf')}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-sand/50 border-b border-line text-[11px] font-semibold text-ink-muted">
              <tr>
                <th className="py-2.5 px-3.5">{t('data.jobPlate')}</th>
                <th className="py-2.5 px-3.5">{t('data.customer')}</th>
                <th className="py-2.5 px-3.5">{t('data.date')}</th>
                <th className="py-2.5 px-3.5">{t('data.price')}</th>
                <th className="py-2.5 px-3.5">{t('data.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredList.map((job) => {
                const effectivePrice = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
                return (
                  <tr
                    key={job.id}
                    onClick={() => onOpenJobDetail(job)}
                    className="hover:bg-sand/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-ink">{job.jobNumber}</div>
                      <div className="font-mono font-bold text-sm text-brand mt-0.5">{job.plateNumber}</div>
                      <div className="text-[11px] text-ink-muted">
                        {job.vehicleMake} {job.vehicleModel}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-ink">{job.customerName}</div>
                      <div className="text-[11px] text-ink-muted font-mono">{job.customerPhone}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-ink">
                      {job.receivedAt ? job.receivedAt.substring(0, 10) : '—'}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-ink tabular-nums">
                      {effectivePrice > 0 ? `${effectivePrice.toLocaleString()} ${settings.currency}` : 'Pending'}
                    </td>
                    <td className="py-3 px-3.5">
                      <StatusBadge status={job.status} showIcon={false} />
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-muted/70">
                    <Car className="w-8 h-8 mx-auto text-line mb-2" />
                    <p className="font-semibold text-ink">{t('data.noRecords')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backup & restore */}
      <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-ink mb-3">{t('data.backupRestore')}</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('data.exportBackup')}</span>
          </button>
          <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-line hover:bg-sand/40 text-ink font-semibold text-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{t('data.restoreBackup')}</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleReloadSampleData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-semibold text-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('data.loadSample')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
