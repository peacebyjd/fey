import React, { useState } from 'react';
import { JobRecord, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { DocumentShareButton } from './DocumentShareButton';
import { canDeleteJob, canManagePricing } from '../../services/permissions';
import { useLanguage } from '../../i18n/LanguageContext';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import {
  X,
  Car,
  Receipt,
  Wrench,
  Clock,
  Download,
  Printer,
  ShieldCheck,
  Calendar,
  UserCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Smartphone,
  Send,
  Phone,
} from 'lucide-react';
import { OfficialJobCardSheet } from '../reception/OfficialJobCardSheet';
import { InsuranceVoucherPanel } from '../reception/InsuranceVoucherModal';

interface JobDetailModalProps {
  job: JobRecord | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onJobUpdated: (job: JobRecord) => void;
  onOpenCostEditor?: (job: JobRecord) => void;
  onOpenAssignEditor?: (job: JobRecord) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  currentUser,
  onJobUpdated,
  onOpenCostEditor,
  onOpenAssignEditor,
}) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const [activeTab, setActiveTab] = useState<'overview' | 'job_card' | 'insurance' | 'finance' | 'assignment_sms' | 'audit' | 'photos'>('overview');
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const totalPaid = (job.payments || []).reduce((acc, p) => acc + p.amount, 0);
  const effectiveTotal = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
  const balance = Math.max(0, effectiveTotal - totalPaid);
  const isPricingRole = canManagePricing(currentUser.role);
  const showFinance = isPricingRole || currentUser.role === 'manager';
  const showTasks = currentUser.role === 'manager' || currentUser.role === 'admin';
  const showHistory = currentUser.role !== 'reception' && currentUser.role !== 'storekeeper';

  const tabs = [
    { id: 'overview', label: t('jobDetail.overview') },
    { id: 'job_card', label: t('jobDetail.jobCard') },
    ...(currentUser.role !== 'storekeeper'
      ? [{ id: 'insurance', label: t('jobDetail.insurancePayment') }]
      : []),
    ...(showFinance ? [{ id: 'finance', label: t('jobDetail.finance') }] : []),
    ...(showTasks
      ? [{ id: 'assignment_sms', label: `${t('jobDetail.tasks')} (${job.smsDispatches?.length || 0})` }]
      : []),
    { id: 'photos', label: `${t('jobDetail.photos')} (${job.photos?.length || 0})` },
    ...(showHistory ? [{ id: 'audit', label: `${t('jobDetail.history')} (${job.auditTrail?.length || 0})` }] : []),
  ];
  const safeTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'overview';

  const handleDeleteJob = () => {
    if (!canDeleteJob(currentUser.role)) {
      alert('Only an administrator can delete vehicle records.');
      return;
    }
    if (confirm(`Are you sure you want to delete job ${job.jobNumber} (${job.plateNumber})? This action is permanent.`)) {
      StorageService.deleteJob(job.id, currentUser.name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-line">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-sand/40 rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-[#800020] text-white font-bold shrink-0">
                {job.jobNumber}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-ink truncate">
                {job.vehicleMake} {job.vehicleModel} ({job.plateNumber})
              </h2>
            </div>
            <p className="text-xs text-ink-muted mt-0.5 truncate">
              {t('jobDetail.customer')}: {job.customerName} ({job.customerPhone}) · {t('jobDetail.received')}: {job.receivedAt}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPricingRole && (
              <>
                <button
                  type="button"
                  onClick={() => PdfService.generateQuotationPdf(job, settings)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/40 rounded-lg cursor-pointer"
                  title={t('jobDetail.quotePdf')}
                >
                  <Download className="w-3.5 h-3.5 text-[#800020]" />
                  <span className="hidden sm:inline">{t('jobDetail.quotePdf')}</span>
                </button>
                <DocumentShareButton
                  title={`${t('jobDetail.quotePdf')} — ${job.jobNumber}`}
                  text={`${t('jobDetail.quotePdf')} · ${job.jobNumber} · ${job.plateNumber} · ${job.vehicleMake} ${job.vehicleModel}\n${settings.garageName} · ${settings.phone}`}
                  getPdf={() => PdfService.generateQuotationPdf(job, settings, { download: false })}
                />
              </>
            )}
            <button
              type="button"
              onClick={() => PdfService.generateRepairJobCardPdf(job, settings)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/40 rounded-lg cursor-pointer"
              title={t('jobDetail.jobCardPdf')}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('jobDetail.jobCardPdf')}</span>
            </button>
            <DocumentShareButton
              title={`${t('jobDetail.jobCardPdf')} — ${job.jobNumber}`}
              text={`${t('jobDetail.jobCardPdf')} · ${job.jobNumber} · ${job.plateNumber} · ${job.vehicleMake} ${job.vehicleModel}\n${settings.garageName} · ${settings.phone}`}
              getPdf={() => PdfService.generateRepairJobCardPdf(job, settings, { download: false })}
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-muted/70 hover:text-ink hover:bg-sand/60 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs — role-based */}
        <div className="flex items-center gap-1 px-4 sm:px-6 border-b border-line bg-white overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                safeTab === tab.id
                  ? 'border-[#800020] text-[#800020]'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {safeTab === 'job_card' && (
            <div className="space-y-4">
              <OfficialJobCardSheet
                job={job}
                onExportPdf={() => PdfService.generateRepairJobCardPdf(job, settings)}
                onClose={onClose}
              />
            </div>
          )}

          {safeTab === 'insurance' && <InsuranceVoucherPanel job={job} />}

          {safeTab === 'overview' && (
            <div className="space-y-5">
              {/* Status and Assignment Banner */}
              <div className="p-4 bg-sand/40 rounded-xl border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <PriorityBadge priority={job.priority} />
                  {job.isDraft && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {t('jobDetail.draftIntake')}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-ink-muted">{t('jobDetail.assignedTeam')}</span>
                  <span className="ml-1.5 font-bold text-ink">
                    {job.assignedTeamName || t('jobDetail.unassigned')}
                  </span>
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div className="space-y-2">
                <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                  {t('jobDetail.vehicleRecord')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white border border-line rounded-xl">
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.makeModel')}</span>
                    <p className="font-semibold text-ink mt-0.5">{job.vehicleMake} {job.vehicleModel}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.plate')}</span>
                    <p className="font-mono font-bold text-ink mt-0.5">{job.plateNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.vin')}</span>
                    <p className="font-mono text-ink mt-0.5">{job.vin || t('common.na')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.mileage')}</span>
                    <p className="font-mono tabular-nums text-ink mt-0.5">
                      {job.mileage ? `${job.mileage.toLocaleString()} km` : t('common.na')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.color')}</span>
                    <p className="text-ink mt-0.5">{job.color || t('jobDetail.standard')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.delivery')}</span>
                    <p className="text-ink mt-0.5">{job.expectedDeliveryDate || t('jobDetail.flexible')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.insurance')}</span>
                    <p className="text-ink mt-0.5">
                      {job.hasInsurance ? `${job.insuranceCompany || t('jobDetail.insured')} (${job.insuranceApprovalStatus})` : t('jobDetail.directCustomer')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted/70">{t('jobDetail.createdBy')}</span>
                    <p className="text-ink mt-0.5">{job.createdBy}</p>
                  </div>
                </div>
              </div>

              {/* Complaint, remark and repair requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-line rounded-xl space-y-1">
                  <h4 className="font-bold text-ink">{t('jobDetail.reportedProblem')}</h4>
                  <p className="text-ink-muted leading-relaxed">{job.customerProblem || t('jobDetail.notRecorded')}</p>
                </div>
                {(job.remarks || job.initialInspectionNotes) &&
                  (job.remarks || job.initialInspectionNotes) !== job.customerProblem && (
                    <div className="p-4 bg-white border border-line rounded-xl space-y-1">
                      <h4 className="font-bold text-ink">{t('jobDetail.intakeRemark')}</h4>
                      <p className="text-ink-muted leading-relaxed">
                        {job.remarks || job.initialInspectionNotes}
                      </p>
                    </div>
                  )}
              </div>

              {(() => {
                const items = (job.priceItems || []).filter((i) => i.name.trim());
                if (items.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                      {t('jobDetail.repairRequirements')}
                    </h3>
                    <div className="border border-line rounded-xl divide-y divide-line overflow-hidden bg-white">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.action === 'Replace'
                                  ? 'bg-brand/10 text-brand border border-brand/30'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {item.action || t('jobDetail.repair')}
                            </span>
                            <span className="text-ink font-semibold truncate">{item.name}</span>
                          </span>
                          {isPricingRole || currentUser.role === 'manager' ? (
                            <span className="font-mono font-bold text-ink shrink-0">
                              {item.amount > 0
                                ? `${item.amount.toLocaleString()} ${settings.currency}`
                                : t('jobDetail.notPriced')}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Condition On Arrival */}
              <div className="p-3 bg-sand/40 border border-line rounded-xl">
                <span className="font-semibold text-ink">{t('jobDetail.condition')}</span>
                <span className="ml-2 text-ink-muted">{job.vehicleConditionOnArrival || t('jobDetail.notRecorded')}</span>
              </div>
            </div>
          )}

          {safeTab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-sand/40 rounded-xl border border-line">
                  <span className="text-[10px] text-ink-muted">{t('jobDetail.quotationStatus')}</span>
                  <p className="text-sm font-bold text-ink mt-0.5">{job.quotationStatus}</p>
                </div>
                <div className="p-3 bg-sand/40 rounded-xl border border-line">
                  <span className="text-[10px] text-ink-muted">{t('jobDetail.estimatedCost')}</span>
                  <p className="text-sm font-mono font-bold text-ink mt-0.5">
                    {job.totalEstimatedCost.toLocaleString()} {settings.currency}
                  </p>
                </div>
                <div className="p-3 bg-sand/40 rounded-xl border border-line">
                  <span className="text-[10px] text-ink-muted">{t('jobDetail.totalPaid')}</span>
                  <p className="text-sm font-mono font-bold text-emerald-700 mt-0.5">
                    {totalPaid.toLocaleString()} {settings.currency}
                  </p>
                </div>
                <div className="p-3 bg-sand/40 rounded-xl border border-line">
                  <span className="text-[10px] text-ink-muted">{t('jobDetail.remainingBalance')}</span>
                  <p className={`text-sm font-mono font-bold mt-0.5 ${balance > 0 ? 'text-coral' : 'text-emerald-700'}`}>
                    {balance.toLocaleString()} {settings.currency}
                  </p>
                </div>
              </div>

              {/* Priced repair / replace items set by Finance */}
              <div>
                <h4 className="font-bold text-ink mb-2">
                  {t('jobDetail.repairPrices')} ({(job.priceItems || []).filter((i) => i.name.trim()).length})
                </h4>
                {(job.priceItems || []).filter((i) => i.name.trim()).length > 0 ? (
                  <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
                    {(job.priceItems || [])
                      .filter((i) => i.name.trim())
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 bg-white"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.action === 'Replace'
                                  ? 'bg-brand/10 text-brand border border-brand/30'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {item.action || t('jobDetail.repair')}
                            </span>
                            <span className="font-semibold text-ink truncate">{item.name}</span>
                          </span>
                          <span className="font-mono font-bold text-ink shrink-0">
                            {item.amount > 0
                              ? `${item.amount.toLocaleString()} ${settings.currency}`
                              : t('jobDetail.notPriced')}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-ink-muted/70 italic">{t('jobDetail.noPricedItems')}</p>
                )}
                <p className="text-[10px] text-ink-muted mt-1">
                  {t('jobDetail.pricesReadOnly')}
                </p>
              </div>

              {/* Spare Parts Breakdown */}
              <div>
                <h4 className="font-bold text-ink mb-2">{t('jobDetail.itemizedParts')} ({job.spareParts?.length || 0})</h4>
                <div className="border border-line rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-sand/40 border-b text-[11px] font-semibold text-ink-muted">
                      <tr>
                        <th className="py-2 px-3">{t('jobDetail.part')}</th>
                        <th className="py-2 px-3 text-right">{t('jobDetail.qty')}</th>
                        <th className="py-2 px-3 text-right">{t('jobDetail.unitPrice')}</th>
                        <th className="py-2 px-3 text-right">{t('jobDetail.total')}</th>
                        <th className="py-2 px-3">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {(job.spareParts || []).map((part) => (
                        <tr key={part.id}>
                          <td className="py-2 px-3 font-medium text-ink">{part.name}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">{part.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">{part.unitPrice.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums text-ink">{part.totalCost.toLocaleString()}</td>
                          <td className="py-2 px-3 font-medium text-ink-muted">{part.availability}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments log */}
              <div>
                <h4 className="font-bold text-ink mb-2">{t('jobDetail.recordedPayments')} ({job.payments?.length || 0})</h4>
                {(job.payments || []).length > 0 ? (
                  <div className="space-y-1.5">
                    {job.payments.map((p) => (
                      <div key={p.id} className="p-2.5 bg-sand/40 border border-line rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ink">{p.paymentMethod} · {p.date}</p>
                          <p className="text-[10px] text-ink-muted">{t('jobDetail.ref')}: {p.reference || t('common.na')} · {t('jobDetail.recordedBy')} {p.recordedBy}</p>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 tabular-nums">
                          +{p.amount.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-muted/70 italic">{t('jobDetail.noPayments')}</p>
                )}
              </div>
            </div>
          )}

          {safeTab === 'assignment_sms' && (
            <div className="space-y-4">
              {/* Mechanic Assignment Card */}
              <div className="p-4 bg-sand/40 border border-line rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-ink-muted/70 uppercase font-semibold">{t('jobDetail.assignedMechanicTeam')}</span>
                  <p className="text-sm font-bold text-ink mt-0.5">
                    {job.assignedTeamName || t('jobDetail.notAssignedYet')}
                  </p>
                  {job.assignedMechanicPhone && (
                    <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#800020]" />
                      <span>{job.assignedMechanicName} · {job.assignedMechanicPhone}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {job.assignedMechanicPhone ? (
                    <button
                      type="button"
                      onClick={() => {
                        StorageService.dispatchTaskSms(
                          job.id,
                          job.assignedMechanicName || 'Mechanic',
                          job.assignedMechanicPhone!,
                          currentUser.name
                        );
                        const fresh = StorageService.getJobById(job.id);
                        if (fresh) onJobUpdated(fresh);
                        setSmsFeedback(`Task SMS re-sent to ${job.assignedMechanicPhone}`);
                        setTimeout(() => setSmsFeedback(null), 3500);
                      }}
                      className="px-3.5 py-2 bg-[#800020] hover:bg-[#600018] text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('jobDetail.dispatchSms')}</span>
                    </button>
                  ) : (
                    onOpenAssignEditor && (
                      <button
                        type="button"
                        onClick={() => onOpenAssignEditor(job)}
                        className="px-3.5 py-2 bg-brand hover:bg-ink text-white font-semibold text-xs rounded-lg cursor-pointer"
                      >
                        {t('jobDetail.assignMechanic')}
                      </button>
                    )
                  )}
                </div>
              </div>

              {smsFeedback && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smsFeedback}</span>
                </div>
              )}

              {/* SMS Dispatch History */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-ink text-xs uppercase tracking-wider">
                    {t('jobDetail.smsLog')} ({job.smsDispatches?.length || 0})
                  </h4>
                  <span className="text-[11px] text-ink-muted/70">{t('jobDetail.automatedDispatch')}</span>
                </div>

                {(job.smsDispatches || []).length > 0 ? (
                  <div className="space-y-2">
                    {job.smsDispatches.map((sms) => (
                      <div key={sms.id} className="p-3 bg-white border border-line rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink font-mono text-xs">{sms.recipientName}</span>
                            <span className="text-ink-muted font-mono text-[11px]">({sms.recipientPhone})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ {sms.status}
                            </span>
                            <span className="text-[10px] text-ink-muted/70 font-mono">{sms.sentAt}</span>
                          </div>
                        </div>
                        <p className="p-2.5 bg-sand/40 rounded-lg font-mono text-[11px] text-ink leading-relaxed border border-line">
                          {sms.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-sand/40 rounded-xl border border-line text-ink-muted/70">
                    <Smartphone className="w-6 h-6 mx-auto mb-1 text-line" />
                    <p className="text-xs">{t('jobDetail.noSms')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {safeTab === 'photos' && (
            <div className="space-y-3">
              <h4 className="font-bold text-ink">{t('jobDetail.vehiclePhotos')}</h4>
              {(job.photos || []).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {job.photos.map((p) => (
                    <div key={p.id} className="border border-line rounded-xl overflow-hidden bg-white">
                      <div className="aspect-4/3 bg-sand/50 overflow-hidden">
                        <img src={p.url} alt={p.caption} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="font-medium text-ink text-[11px] truncate">{p.caption}</p>
                        <p className="text-[10px] text-ink-muted/70 tabular-nums">{p.capturedAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted/70 italic">{t('jobDetail.noPhotos')}</p>
              )}
            </div>
          )}

          {safeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-ink">{t('jobDetail.auditTrail')}</h4>
                <span className="text-[11px] text-ink-muted/70">{t('jobDetail.auditDesc')}</span>
              </div>
              <div className="space-y-2">
                {(job.auditTrail || []).map((entry) => (
                  <div key={entry.id} className="p-3 bg-sand/40 border border-line rounded-xl flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{entry.action}</span>
                        <span className="text-[10px] font-medium text-ink-muted bg-sand/70 px-1.5 py-0.5 rounded">
                          {entry.performedBy}
                        </span>
                      </div>
                      <p className="text-ink-muted mt-0.5">{entry.details}</p>
                    </div>
                    <span className="font-mono text-[10px] text-ink-muted/70 whitespace-nowrap">
                      {entry.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-line bg-sand/40 rounded-b-2xl flex items-center justify-between">
          {canDeleteJob(currentUser.role) ? (
            <button
              type="button"
              onClick={handleDeleteJob}
              className="flex items-center gap-1.5 text-xs text-coral hover:text-brand hover:bg-coral/10 px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('jobDetail.delete')}</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {onOpenCostEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCostEditor(job);
                }}
                className="px-3 py-2 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/50 rounded-xl"
              >
                {t('jobDetail.openCost')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#600018] rounded-xl shadow-xs"
            >
              {t('jobDetail.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
