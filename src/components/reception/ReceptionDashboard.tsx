import React, { useState } from 'react';
import { JobRecord, JobStatus, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { StatusBadge } from '../common/StatusBadge';
import { VehicleRegistrationModal } from './VehicleRegistrationModal';
import { OfficialJobCardSheet } from './OfficialJobCardSheet';
import { PartsRequestModal } from './PartsRequestModal';
import { DEMO_SAMPLE_JOB } from '../../services/sampleData';
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
  Printer,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [selectedJobForJobCard, setSelectedJobForJobCard] = useState<JobRecord | null>(null);
  const [showBlankJobCard, setShowBlankJobCard] = useState(false);
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
    setShowBlankJobCard(false);
    setShowSampleJobCard(false);
  };

  const blankJobCardPreview: JobRecord = {
    id: 'blank-print',
    jobNumber: StorageService.getNextJobNumber(),
    status: 'Received',
    createdAt: new Date().toISOString(),
    createdBy: currentUser.name,
    updatedAt: new Date().toISOString(),
    customerName: '',
    customerPhone: '',
    vehicleMake: '',
    vehicleModel: '',
    plateNumber: '',
    vin: '',
    mileage: null,
    receivedAt: new Date().toISOString().substring(0, 10),
    customerProblem: '',
    repairDescription: '',
    initialInspectionNotes: '',
    sparePartsRequiredNotes: '',
    vehicleConditionOnArrival: '',
    hasInsurance: false,
    photos: [],
    priority: 'Medium',
    laborCost: 0,
    sparePartsCost: 0,
    additionalServiceCost: 0,
    otherCharges: 0,
    discount: 0,
    taxRate: 15,
    totalEstimatedCost: 0,
    finalApprovedPrice: 0,
    actualFinalCost: 0,
    quotationStatus: 'Draft',
    quotationValidityDays: 14,
    spareParts: [],
    payments: [],
    paymentStatus: 'Unpaid',
    smsDispatches: [],
    checklist: [],
    auditTrail: [],
  };

  const previewJob =
    selectedJobForJobCard || (showSampleJobCard ? DEMO_SAMPLE_JOB : blankJobCardPreview);

  const totalRegisteredToday = jobs.filter(
    (j) => j.receivedAt && j.receivedAt.startsWith(new Date().toISOString().substring(0, 10))
  ).length;

  return (
    <div className="space-y-5">
      {/* Top Banner & Intake CTA */}
      <div className="bg-white rounded-2xl border border-line/80 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">
              ፋያሜት አውቶ ጋራጅ · fyamet AUTO GARAGE
            </span>
            <span className="hidden sm:inline text-line">·</span>
            <span className="text-xs font-medium text-ink-muted bg-sand/50 px-2 py-0.5 rounded border border-line">
              አዲስ አበባ · Addis Ababa- Ethiopia
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink mt-1">
            Recorder &amp; Intake
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Register the vehicle and repair requirements. Finance sets the prices.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowBlankJobCard(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sand/50 hover:bg-sand text-ink font-semibold text-xs transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-ink-muted" />
            <span>Blank Job Card</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSampleJobCard(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sand/50 hover:bg-sand text-ink font-semibold text-xs transition cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-brand" />
            <span>Sample Job Card</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenRegistration()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#800020] hover:bg-[#600018] text-white font-bold text-xs sm:text-sm shadow-xs transition duration-150 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Job Card</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs sm:text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Quick Reception Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-line">
          <p className="text-[11px] font-medium text-ink-muted">Received Today</p>
          <p className="text-xl font-bold text-ink tabular-nums mt-0.5">
            {totalRegisteredToday}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-line">
          <p className="text-[11px] font-medium text-ink-muted">Total Active Jobs</p>
          <p className="text-xl font-bold text-ink tabular-nums mt-0.5">
            {jobs.filter((j) => j.status !== 'Completed' && j.status !== 'Cancelled').length}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-line">
          <p className="text-[11px] font-medium text-ink-muted">Awaiting Inspection</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-0.5">
            {jobs.filter((j) => j.status === 'Awaiting Inspection' || j.status === 'Received').length}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-line">
          <p className="text-[11px] font-medium text-ink-muted">Insurance Claims</p>
          <p className="text-xl font-bold text-blue-700 tabular-nums mt-0.5">
            {jobs.filter((j) => j.hasInsurance).length}
          </p>
        </div>
      </div>

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
            placeholder="Search by Plate Number, Job #, Customer, or Model..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-2 text-xs border border-line rounded-lg bg-sand/40 focus:outline-none focus:ring-1 focus:ring-[#800020]"
          >
            <option value="all">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Awaiting Inspection">Awaiting Inspection</option>
            <option value="Awaiting Quotation Approval">Awaiting Quotation</option>
            <option value="Awaiting Spare Parts">Awaiting Spare Parts</option>
            <option value="Ready to Start">Ready to Start</option>
            <option value="In Progress">In Progress</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Ready for Delivery">Ready for Delivery</option>
          </select>

          <select
            value={insuranceFilter}
            onChange={(e) => setInsuranceFilter(e.target.value)}
            className="px-2.5 py-2 text-xs border border-line rounded-lg bg-sand/40 focus:outline-none focus:ring-1 focus:ring-[#800020]"
          >
            <option value="all">All Billing</option>
            <option value="insured">Insurance Covered</option>
            <option value="direct">Private / Direct</option>
          </select>
        </div>
      </div>

      {/* Vehicle Intake List (Tablet-Friendly Table & Responsive Cards) */}
      <div className="bg-white rounded-xl border border-line overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            Registered Vehicles ({filteredJobs.length})
          </span>
          <span className="text-[11px] text-ink-muted/70">Tap row to view full job record</span>
        </div>

        {filteredJobs.length > 0 ? (
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-line rounded-xl p-3.5 shadow-2xs space-y-2.5 hover:border-brand/50 transition"
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
                  title="Open the job record"
                >
                  <div className="font-bold text-lg text-ink font-mono tracking-wide">
                    {job.plateNumber}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {job.vehicleMake} {job.vehicleModel} · {job.customerName}
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-sand/40 border border-line rounded-lg px-2 py-1.5 min-w-0">
                    <p className="text-ink-muted">Received</p>
                    <p className="font-mono font-semibold text-ink truncate">{job.receivedAt}</p>
                  </div>
                  <div className="bg-sand/40 border border-line rounded-lg px-2 py-1.5 min-w-0">
                    <p className="text-ink-muted">Team</p>
                    <p className="font-semibold text-ink truncate">
                      {job.assignedTeamName || 'Not assigned'}
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
                      <span className="truncate">Direct customer</span>
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
                  <span>Request Spare Part</span>
                </button>

                <div className="flex items-center gap-1.5 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => onOpenJobDetail(job)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJobForJobCard(job)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-sand/60 hover:bg-sand text-brand border border-line rounded-lg text-[11px] font-semibold transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Review</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRegistration(job)}
                    title="Edit intake details"
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
            <p className="font-semibold text-ink">No vehicle records match search filter</p>
            <p className="mt-1">Click "New Job Card" to register an incoming vehicle with the official sheet format.</p>
          </div>
        )}
      </div>

      {/* Official Job Card Sheet Modal (Filled or Blank) */}
      {(selectedJobForJobCard || showBlankJobCard || showSampleJobCard) && (
        <div className="fixed inset-0 z-50 bg-ink/70 p-2 sm:p-4 flex items-center justify-center overflow-hidden no-print">
          <div className="w-full max-w-4xl h-full max-h-[96vh] flex flex-col">
            {/* Action bar stays outside the scrolling PDF so it never covers it */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 bg-white rounded-2xl border border-line shadow-lg px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-1 bg-coral/10 text-[#800020] text-xs font-bold rounded-lg border border-coral/30 uppercase tracking-wide shrink-0">
                  {showSampleJobCard
                    ? 'Sample Job Card'
                    : showBlankJobCard
                    ? 'Blank Job Card'
                    : 'Review Job Card'}
                </span>
                <span className="font-mono text-xs font-bold text-ink truncate">
                  {previewJob.jobNumber}
                </span>
                {showSampleJobCard && (
                  <span className="shrink-0 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold uppercase tracking-wide">
                    Sample
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExportJobCardPdf(previewJob)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                  title="Export this job card as a PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={closeJobCardPreview}
                  className="p-2 text-ink-muted hover:text-ink hover:bg-sand rounded-xl transition cursor-pointer"
                  title="Close review"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showSampleJobCard && (
              <div className="shrink-0 mb-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
                <p className="text-xs font-bold">Sample preview - not a real record.</p>
                <p className="text-[11px] text-amber-900/80 mt-0.5">
                  This job card is a demo. It is not saved, not reported, and not counted in Finance.
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
