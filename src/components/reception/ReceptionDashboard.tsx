import React, { useState } from 'react';
import { JobRecord, JobStatus, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { StatusBadge } from '../common/StatusBadge';
import { VehicleRegistrationModal } from './VehicleRegistrationModal';
import { OfficialJobCardSheet } from './OfficialJobCardSheet';
import { PartsRequestModal } from './PartsRequestModal';
import { DEMO_SAMPLE_JOB } from '../../services/sampleData';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Car,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Camera,
  Edit,
  Eye,
  FileText,
  ShieldCheck,
  ChevronRight,
  X,
  Download,
  PackagePlus,
} from 'lucide-react';


interface ReceptionDashboardProps {
  jobs: JobRecord[];
  currentUser: User;
  onOpenJobDetail: (job: JobRecord) => void;
  onRefreshJobs: () => void;
}

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({
  jobs,
  currentUser,
  onOpenJobDetail,
  onRefreshJobs,
}) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [selectedJobForJobCard, setSelectedJobForJobCard] = useState<JobRecord | null>(null);
  const [showSampleJobCard, setShowSampleJobCard] = useState(false);
  const [partsJob, setPartsJob] = useState<JobRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<string>('all');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const filteredJobs = jobs.filter((job) => {
    // Completed vehicles leave the active Registered Vehicles list.
    if (job.status === 'Completed') return false;

    const matchesSearch =
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${job.vehicleMake} ${job.vehicleModel}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.vin && job.vin.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesInsurance =
      insuranceFilter === 'all' ||
      (insuranceFilter === 'insured' && job.hasInsurance) ||
      (insuranceFilter === 'direct' && !job.hasInsurance);

    return matchesSearch && matchesStatus && matchesInsurance;
  });

  const handleOpenRegistration = (jobToEdit?: JobRecord) => {
    setEditingJob(jobToEdit || null);
    setIsModalOpen(true);
  };

  const handleJobSaved = (savedJob: JobRecord) => {
    onRefreshJobs();
    setSaveSuccessMessage(
      `Vehicle ${savedJob.vehicleMake} ${savedJob.vehicleModel} (${savedJob.plateNumber}) successfully saved under ${savedJob.jobNumber}. Central record updated.`
    );
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  const handleExportJobCardPdf = (job: JobRecord) => {
    PdfService.generateRepairJobCardPdf(job, StorageService.getSettings());
  };

  const closeJobCardPreview = () => {
    setSelectedJobForJobCard(null);
    setShowSampleJobCard(false);
  };

  const previewJob = selectedJobForJobCard || DEMO_SAMPLE_JOB;

  const totalRegisteredToday = jobs.filter(
    (j) => j.receivedAt && j.receivedAt.startsWith(new Date().toISOString().substring(0, 10))
  ).length;

  return (
    <div className="space-y-5">
      {/* Compact header: title, intake actions and live counts in one card */}
      <div className="bg-white rounded-2xl border border-line/80 p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-ink leading-tight">
              {t('recorder.title')}
            </h1>
            <p className="text-[11px] text-ink-muted mt-0.5 truncate">
              <span className="font-semibold text-[#800020]">{settings.garageName}</span>
              <span className="mx-1.5 text-line">·</span>
              {settings.address}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSampleJobCard(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sand/50 hover:bg-sand text-ink font-semibold text-[11px] sm:text-xs transition cursor-pointer"
              title={t('recorder.sampleJobCard')}
            >
              <FileText className="w-3.5 h-3.5 text-brand" />
              <span>{t('recorder.sampleJobCard')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenRegistration()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#600018] text-white font-bold text-[11px] sm:text-xs shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('recorder.newJobCard')}</span>
            </button>
          </div>
        </div>

        {/* Slim live counts — one line instead of four cards */}
        <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sand/50 border border-line">
            <span className="text-ink-muted">{t('recorder.receivedToday')}</span>
            <b className="font-mono text-ink tabular-nums">{totalRegisteredToday}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sand/50 border border-line">
            <span className="text-ink-muted">{t('recorder.activeJobs')}</span>
            <b className="font-mono text-ink tabular-nums">
              {jobs.filter((j) => j.status !== 'Completed' && j.status !== 'Cancelled').length}
            </b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-amber-800">{t('recorder.awaitingInspection')}</span>
            <b className="font-mono text-amber-800 tabular-nums">
              {jobs.filter((j) => j.status === 'Awaiting Inspection' || j.status === 'Received').length}
            </b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
            <span className="text-blue-800">{t('recorder.insuranceClaims')}</span>
            <b className="font-mono text-blue-800 tabular-nums">
              {jobs.filter((j) => j.hasInsurance).length}
            </b>
          </span>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs sm:text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-xl border border-line p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted/70">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('recorder.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('recorder.status')}</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-2 text-xs border border-line rounded-lg bg-sand/40 focus:outline-none focus:ring-1 focus:ring-[#800020]"
          >
            <option value="all">{t('recorder.allStatuses')}</option>
            <option value="Received">{t('status.received')}</option>
            <option value="Awaiting Inspection">{t('status.awaitingInspection')}</option>
            <option value="Awaiting Quotation Approval">{t('status.awaitingQuotation')}</option>
            <option value="Awaiting Spare Parts">{t('status.awaitingParts')}</option>
            <option value="Ready to Start">{t('status.readyToStart')}</option>
            <option value="In Progress">{t('status.inProgress')}</option>
            <option value="Quality Check">{t('status.qualityCheck')}</option>
            <option value="Ready for Delivery">{t('status.readyForDelivery')}</option>
          </select>

          <select
            value={insuranceFilter}
            onChange={(e) => setInsuranceFilter(e.target.value)}
            className="px-2.5 py-2 text-xs border border-line rounded-lg bg-sand/40 focus:outline-none focus:ring-1 focus:ring-[#800020]"
          >
            <option value="all">{t('recorder.allBilling')}</option>
            <option value="insured">{t('recorder.insured')}</option>
            <option value="direct">{t('recorder.direct')}</option>
          </select>
        </div>
      </div>

      {/* Vehicle Intake List (Tablet-Friendly Table & Responsive Cards) */}
      <div className="bg-white rounded-xl border border-line overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            {t('recorder.registeredVehicles', { count: filteredJobs.length })}
          </span>
          <span className="text-[11px] text-ink-muted/70">{t('recorder.tapRow')}</span>
        </div>

        {filteredJobs.length > 0 ? (
          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-line rounded-xl p-3 shadow-2xs space-y-2 hover:border-brand/50 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-ink flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{job.jobNumber}</span>
                    {job.isDraft && (
                      <span className="shrink-0 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-sans">
                        Draft
                      </span>
                    )}
                  </span>
                  <StatusBadge status={job.status} />
                </div>

                <button
                  type="button"
                  onClick={() => onOpenJobDetail(job)}
                  className="text-left w-full cursor-pointer"
                  title={t('recorder.openRecord')}
                >
                  <div className="font-bold text-base text-ink font-mono tracking-wide">
                    {job.plateNumber}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {job.vehicleMake} {job.vehicleModel} · {job.customerName}
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-sand/40 border border-line rounded-lg px-2 py-1.5 min-w-0">
                    <p className="text-ink-muted">{t('recorder.received')}</p>
                    <p className="font-mono font-semibold text-ink truncate">{job.receivedAt}</p>
                  </div>
                  <div className="bg-sand/40 border border-line rounded-lg px-2 py-1.5 min-w-0">
                    <p className="text-ink-muted">{t('recorder.team')}</p>
                    <p className="font-semibold text-ink truncate">
                      {job.assignedTeamName || t('common.notAssigned')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
                  <span className="inline-flex items-center gap-1 min-w-0">
                    {job.hasInsurance ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span className="truncate">{job.insuranceCompany || 'Insured'}</span>
                      </>
                    ) : (
                      <span className="truncate">{t('recorder.directCustomer')}</span>
                    )}
                  </span>
                  <span className="font-mono shrink-0">{job.customerPhone}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setPartsJob(job)}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-2 bg-coral/5 hover:bg-coral/10 text-brand border border-dashed border-brand/40 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>{t('recorder.requestPart')}</span>
                </button>

                <div className="flex items-center gap-1.5 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => onOpenJobDetail(job)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('recorder.view')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJobForJobCard(job)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-sand/60 hover:bg-sand text-brand border border-line rounded-lg text-[11px] font-semibold transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('recorder.review')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRegistration(job)}
                    title={t('recorder.editIntake')}
                    className="px-2.5 py-2 text-ink-muted hover:text-ink hover:bg-sand/60 rounded-lg border border-line transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-ink-muted">
            <Car className="w-8 h-8 mx-auto text-line mb-2" />
            <p className="font-semibold text-ink">{t('recorder.noRecords')}</p>
            <p className="mt-1">{t('recorder.newJobHint')}</p>
          </div>
        )}
      </div>

      {/* Official Job Card Sheet Modal */}
      {(selectedJobForJobCard || showSampleJobCard) && (
        <div className="fixed inset-0 z-50 bg-ink/70 p-2 sm:p-4 flex items-center justify-center overflow-hidden no-print">
          <div className="w-full max-w-4xl h-full max-h-[96vh] flex flex-col">
            {/* Action bar stays outside the scrolling PDF so it never covers it */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 bg-white rounded-2xl border border-line shadow-lg px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-1 bg-coral/10 text-[#800020] text-xs font-bold rounded-lg border border-coral/30 uppercase tracking-wide shrink-0">
                  {showSampleJobCard ? t('recorder.sampleJobCard') : t('recorder.reviewJobCard')}
                </span>
                <span className="font-mono text-xs font-bold text-ink truncate">
                  {previewJob.jobNumber}
                </span>
                {showSampleJobCard && (
                  <span className="shrink-0 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold uppercase tracking-wide">
                    {t('recorder.sampleBadge')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExportJobCardPdf(previewJob)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                  title={t('recorder.exportPdfTitle')}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('common.exportPdf')}</span>
                </button>
                <button
                  type="button"
                  onClick={closeJobCardPreview}
                  className="p-2 text-ink-muted hover:text-ink hover:bg-sand rounded-xl transition cursor-pointer"
                  title={t('recorder.closeReview')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showSampleJobCard && (
              <div className="shrink-0 mb-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
                <p className="text-xs font-bold">{t('recorder.sampleNotice')}</p>
                <p className="text-[11px] text-amber-900/80 mt-0.5">
                  {t('recorder.sampleNoticeDesc')}
                </p>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl">
              <OfficialJobCardSheet
                hideToolbar
                job={previewJob}
                onClose={closeJobCardPreview}
              />
            </div>
          </div>
        </div>
      )}

      <PartsRequestModal
        isOpen={!!partsJob}
        job={partsJob}
        currentUser={currentUser}
        onClose={() => setPartsJob(null)}
      />

      {/* Modal for Registering/Editing Vehicle */}
      <VehicleRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        editingJob={editingJob}
        onJobSaved={handleJobSaved}
      />
    </div>
  );
};
