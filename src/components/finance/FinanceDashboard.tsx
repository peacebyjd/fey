import React, { useState } from 'react';
import { JobRecord, PriceItem, PaymentRecord, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { DocumentShareButton } from '../common/DocumentShareButton';
import { StatusBadge } from '../common/StatusBadge';
import { useLanguage } from '../../i18n/LanguageContext';
import { PriceItemPicker } from './PriceItemPicker';
import { FinanceOverview } from './FinanceOverview';
import { SalaryPage } from './SalaryPage';
import { ExpensesPage } from './ExpensesPage';
import {
  Car,
  Download,
  Printer,
  Search,
  CreditCard,
  UserCheck,
  Send,
  Check,
  CheckCircle2,
  LayoutDashboard,
  Wallet,
  ReceiptText,
  Tag,
} from 'lucide-react';

/** Legacy jobs stored costs separately; turn them into editable price lines. */
const itemsForJob = (job: JobRecord): PriceItem[] => {
  if (job.priceItems && job.priceItems.length > 0) return [...job.priceItems];
  const items: PriceItem[] = [];
  if (job.laborCost > 0) {
    items.push({
      id: `legacy-labor-${job.id}`,
      name: job.repairDescription || 'Workshop Labor',
      amount: job.laborCost,
      action: 'Repair',
    });
  }
  (job.spareParts || []).forEach((part) => {
    items.push({ id: part.id, name: part.name, amount: part.totalCost, action: 'Replace' });
  });
  if (job.additionalServiceCost > 0) {
    items.push({
      id: `legacy-additional-${job.id}`,
      name: 'Additional Diagnostics & Quality Checks',
      amount: job.additionalServiceCost,
      action: 'Repair',
    });
  }
  if (job.otherCharges > 0) {
    items.push({
      id: `legacy-other-${job.id}`,
      name: 'Other Charges',
      amount: job.otherCharges,
      action: 'Repair',
    });
  }
  return items;
};

interface FinanceDashboardProps {
  jobs: JobRecord[];
  currentUser: User;
  onOpenJobDetail: (job: JobRecord) => void;
  onRefreshJobs: () => void;
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  jobs,
  currentUser,
  onOpenJobDetail,
  onRefreshJobs,
}) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const catalog = StorageService.getPriceItems();

  const [view, setView] = useState<'overview' | 'pricing' | 'salary' | 'expenses'>('overview');
  const [filterTab, setFilterTab] = useState<'awaiting_price' | 'active_priced' | 'ready_payment' | 'all'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<PriceItem[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentRecord['paymentMethod']>('Cash');
  const [payReference, setPayReference] = useState('');

  const awaitingPriceJobs = jobs.filter(
    (j) =>
      j.status !== 'Completed' &&
      j.status !== 'Cancelled' &&
      (j.status === 'Received' ||
        j.status === 'Awaiting Inspection' ||
        j.quotationStatus === 'Draft' ||
        (j.totalEstimatedCost === 0 && j.finalApprovedPrice === 0))
  );

  const activePricedJobs = jobs.filter(
    (j) =>
      (j.totalEstimatedCost > 0 || j.finalApprovedPrice > 0) &&
      j.status !== 'Completed' &&
      j.status !== 'Cancelled'
  );

  const readyPaymentJobs = jobs.filter(
    (j) =>
      (j.status === 'Quality Check' || j.status === 'Ready for Delivery' || j.status === 'Completed') &&
      j.paymentStatus !== 'Paid'
  );

  const totalCollectedPayments = jobs.reduce(
    (sum, j) => sum + (j.payments || []).reduce((acc, p) => acc + p.amount, 0),
    0
  );

  const totalOutstandingBalance = Math.max(
    0,
    jobs.reduce((sum, j) => {
      const effective = j.finalApprovedPrice > 0 ? j.finalApprovedPrice : j.totalEstimatedCost;
      const paid = (j.payments || []).reduce((acc, p) => acc + p.amount, 0);
      return sum + Math.max(0, effective - paid);
    }, 0)
  );

  const filteredList = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      job.jobNumber.toLowerCase().includes(q) ||
      job.plateNumber.toLowerCase().includes(q) ||
      job.customerName.toLowerCase().includes(q) ||
      `${job.vehicleMake} ${job.vehicleModel}`.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterTab === 'awaiting_price') {
      return (
        job.status !== 'Completed' &&
        job.status !== 'Cancelled' &&
        (job.status === 'Received' ||
          job.status === 'Awaiting Inspection' ||
          job.quotationStatus === 'Draft' ||
          (job.totalEstimatedCost === 0 && job.finalApprovedPrice === 0))
      );
    }
    if (filterTab === 'active_priced') {
      return (
        (job.totalEstimatedCost > 0 || job.finalApprovedPrice > 0) &&
        job.status !== 'Completed' &&
        job.status !== 'Cancelled'
      );
    }
    if (filterTab === 'ready_payment') {
      return (
        (job.status === 'Quality Check' ||
          job.status === 'Ready for Delivery' ||
          job.status === 'Completed') &&
        job.paymentStatus !== 'Paid'
      );
    }
    return true;
  });

  const activeJob = jobs.find((j) => j.id === selectedJobId) || null;

  const draftTotal = draftItems.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaid = (activeJob?.payments || []).reduce((acc, p) => acc + p.amount, 0);
  const effectiveTotal = activeJob
    ? activeJob.finalApprovedPrice > 0
      ? activeJob.finalApprovedPrice
      : activeJob.totalEstimatedCost
    : 0;
  const remainingBalance = Math.max(0, effectiveTotal - totalPaid);

  const flash = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3500);
  };

  const handleSelectJob = (job: JobRecord) => {
    setSelectedJobId(job.id);
    setDraftItems(itemsForJob(job));
    setShowAddPayment(false);
  };

  const handleSavePrice = (shareWithManager: boolean) => {
    if (!activeJob) return;
    const total = draftTotal;

    let nextStatus = activeJob.status;
    if (
      shareWithManager &&
      (activeJob.status === 'Received' ||
        activeJob.status === 'Awaiting Inspection' ||
        activeJob.status === 'Awaiting Quotation Approval')
    ) {
      nextStatus = 'Ready to Start';
    }

    const updatedJob: JobRecord = {
      ...activeJob,
      priceItems: draftItems,
      laborCost: total,
      sparePartsCost: 0,
      additionalServiceCost: 0,
      otherCharges: 0,
      discount: 0,
      taxRate: 0,
      totalEstimatedCost: total,
      finalApprovedPrice: total,
      actualFinalCost: total,
      quotationStatus: shareWithManager ? 'Approved' : activeJob.quotationStatus || 'Draft',
      quotationDate: activeJob.quotationDate || new Date().toISOString().substring(0, 10),
      status: nextStatus,
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: shareWithManager ? 'Price Set & Sent to Manager' : 'Price Updated',
          performedBy: currentUser.name,
          userRole: currentUser.role,
          details: `Repair price set to ${total.toLocaleString()} ${settings.currency} (${draftItems
            .map((i) => `${i.name}${i.action ? ` - ${i.action}` : ''}: ${i.amount.toLocaleString()}`)
            .join(', ') || 'no items'}).`,
          type: 'price',
        },
        ...(activeJob.auditTrail || []),
      ],
    };

    const saved = StorageService.saveJobPricing(activeJob.id, updatedJob);
    if (!saved) {
      flash('You do not have permission to change prices.');
      return;
    }

    if (shareWithManager) {
      StorageService.addNotification({
        targetRole: 'manager',
        title: 'Price Ready for Assignment',
        message: `${activeJob.vehicleMake} ${activeJob.vehicleModel} (${activeJob.plateNumber}) price set to ${total.toLocaleString()} ${settings.currency}. Items: ${draftItems
          .map((i) => `${i.name}${i.action ? ` (${i.action})` : ''}`)
          .join(', ') || 'none'}. Ready for a team.`,
        jobId: activeJob.id,
        jobNumber: activeJob.jobNumber,
        type: 'approval',
      });
    }

    onRefreshJobs();
    flash(
      shareWithManager
        ? `Price ${total.toLocaleString()} ${settings.currency} saved and sent to the Manager.`
        : `Price ${total.toLocaleString()} ${settings.currency} saved.`
    );
  };

  const handleRecordPayment = () => {
    if (!activeJob || payAmount <= 0) return;

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      recordedBy: currentUser.name,
      reference: payReference.trim() || undefined,
    };

    const updatedPayments = [...(activeJob.payments || []), newPayment];
    const newPaidTotal = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const finalAmount = activeJob.finalApprovedPrice || activeJob.totalEstimatedCost;
    const newPaymentStatus =
      newPaidTotal >= finalAmount && finalAmount > 0
        ? 'Paid'
        : newPaidTotal > 0
        ? 'Partially Paid'
        : 'Unpaid';

    StorageService.saveJob({
      ...activeJob,
      payments: updatedPayments,
      paymentStatus: newPaymentStatus,
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Payment Recorded',
          performedBy: currentUser.name,
          userRole: currentUser.role,
          details: `Recorded payment of ${payAmount.toLocaleString()} ${settings.currency} via ${payMethod}.`,
          type: 'payment',
        },
        ...(activeJob.auditTrail || []),
      ],
    });

    onRefreshJobs();
    setShowAddPayment(false);
    setPayAmount(0);
    setPayReference('');
    flash(`Payment of ${payAmount.toLocaleString()} ${settings.currency} recorded.`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">{t('finance.title')}</h1>
          <p className="text-sm text-ink-muted">
            {t('finance.description', { currency: settings.currency })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DocumentShareButton
            title={t('finance.exportLedger')}
            text={`${t('finance.exportLedger')} · ${jobs.length}\n${settings.garageName} · ${settings.phone}`}
            getPdf={() => PdfService.generateDailySummaryPdf(jobs, settings, { download: false })}
          />
          <button
            type="button"
            onClick={() => PdfService.generateDailySummaryPdf(jobs, settings)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-xs shadow-xs transition cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('finance.exportLedger')}</span>
          </button>
        </div>
      </div>

      {/* Finance sections */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold bg-white p-2.5 rounded-xl border border-line shadow-2xs">
        {[
          { id: 'overview', label: t('finance.overview'), icon: LayoutDashboard },
          { id: 'pricing', label: t('finance.vehiclePricing'), icon: Tag },
          { id: 'salary', label: t('finance.salary'), icon: Wallet },
          { id: 'expenses', label: t('finance.expenses'), icon: ReceiptText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id as typeof view)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                view === tab.id ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {view === 'overview' && <FinanceOverview jobs={jobs} />}
      {view === 'salary' && <SalaryPage currentUser={currentUser} />}
      {view === 'expenses' && <ExpensesPage currentUser={currentUser} />}

      {view === 'pricing' && (
        <>
      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-sm text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-line shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">{t('finance.needsPrice')}</span>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-0.5">{awaitingPriceJobs.length}</p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-line shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">{t('finance.priced')}</span>
          <p className="text-xl font-bold text-ink tabular-nums mt-0.5">{activePricedJobs.length}</p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-line shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">{t('finance.collected')}</span>
          <p className="text-xl font-mono font-bold text-emerald-700 tabular-nums mt-0.5">
            {totalCollectedPayments.toLocaleString()}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-line shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">{t('finance.balanceDue')}</span>
          <p className="text-xl font-mono font-bold text-coral tabular-nums mt-0.5">
            {totalOutstandingBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-line shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: t('finance.all'), count: jobs.length },
            { id: 'awaiting_price', label: t('finance.needsPrice'), count: awaitingPriceJobs.length },
            { id: 'active_priced', label: t('finance.priced'), count: activePricedJobs.length },
            { id: 'ready_payment', label: t('finance.balanceDue'), count: readyPaymentJobs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === tab.id ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 rounded-full text-[10px] font-mono ${
                  filterTab === tab.id ? 'bg-white/20' : 'bg-sand'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative sm:min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-muted/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('finance.searchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Vehicle list */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-line overflow-hidden shadow-2xs">
          <div className="p-3.5 border-b border-line bg-sand/40">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              {t('finance.vehicles', { count: filteredList.length })}
            </span>
          </div>

          <div className="p-2 space-y-2 max-h-[720px] overflow-y-auto">
            {filteredList.map((job) => {
              const isSelected = activeJob?.id === job.id;
              const hasPrice = job.totalEstimatedCost > 0 || job.finalApprovedPrice > 0;
              const effective = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;

              return (
                <div
                  key={job.id}
                  onClick={() => handleSelectJob(job)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-coral/10 border-brand shadow-xs ring-1 ring-brand'
                      : 'bg-white border-line hover:bg-sand/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-ink">{job.jobNumber}</span>
                    <StatusBadge status={job.status} showIcon={false} />
                  </div>
                  <div className="font-bold text-sm text-ink font-mono tracking-wide">{job.plateNumber}</div>
                  <div className="text-xs text-ink-muted truncate">
                    {job.vehicleMake} {job.vehicleModel} · {job.customerName}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs border-t border-line pt-1.5">
                    <span className="text-[11px] text-ink-muted/70 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {job.createdBy || t('finance.recorder')}
                    </span>
                    <span className={`font-mono font-bold tabular-nums ${hasPrice ? 'text-ink' : 'text-amber-700'}`}>
                      {hasPrice ? `${effective.toLocaleString()}` : t('finance.notPriced')}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-8 text-center text-xs text-ink-muted/70">
                <Car className="w-8 h-8 mx-auto text-line mb-2" />
                <p className="font-medium text-ink">{t('finance.noVehicles')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail + pricing */}
        {activeJob ? (
          <div className="lg:col-span-8 space-y-4">
            {/* Vehicle summary */}
            <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-brand text-white font-bold">
                      {activeJob.jobNumber}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-ink font-mono">
                      {activeJob.plateNumber}
                    </h2>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {activeJob.vehicleMake} {activeJob.vehicleModel} · {activeJob.customerName} ({activeJob.customerPhone})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => PdfService.generateQuotationPdf(activeJob, settings)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ink bg-sand/50 hover:bg-sand rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-brand" />
                    <span>{t('finance.quotation')}</span>
                  </button>
                  <DocumentShareButton
                    title={`${t('finance.quotation')} — ${activeJob.jobNumber}`}
                    text={`${t('finance.quotation')} · ${activeJob.jobNumber} · ${activeJob.plateNumber}\n${settings.garageName} · ${settings.phone}`}
                    getPdf={() => PdfService.generateQuotationPdf(activeJob, settings, { download: false })}
                  />
                  <button
                    type="button"
                    onClick={() => PdfService.generateInvoicePdf(activeJob, settings)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ink bg-sand/50 hover:bg-sand rounded-lg cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{t('finance.invoice')}</span>
                  </button>
                  <DocumentShareButton
                    title={`${t('finance.invoice')} — ${activeJob.jobNumber}`}
                    text={`${t('finance.invoice')} · ${activeJob.jobNumber} · ${activeJob.plateNumber}\n${settings.garageName} · ${settings.phone}`}
                    getPdf={() => PdfService.generateInvoicePdf(activeJob, settings, { download: false })}
                  />
                </div>
              </div>

              <div className="p-3 bg-coral/10 rounded-xl border border-coral/30 text-xs">
                <span className="font-bold text-brand">{t('finance.reportedProblem')} </span>
                <span className="text-ink">{activeJob.customerProblem || t('finance.noDefect')}</span>
              </div>
            </div>

            {/* Price picker */}
            <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="border-b border-line pb-3">
                <h3 className="text-sm font-bold text-ink">{t('finance.setPrice')}</h3>
                <p className="text-xs text-ink-muted">
                  {t('finance.setPriceDesc')}
                </p>
              </div>

              <PriceItemPicker
                catalog={catalog}
                value={draftItems}
                onChange={setDraftItems}
                currency={settings.currency}
              />

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSavePrice(false)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-ink bg-sand hover:bg-line rounded-xl transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('finance.savePrice')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePrice(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('finance.saveSend')}</span>
                </button>
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-ink-muted" />
                    <span>{t('finance.payments')}</span>
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t('finance.paid')} {totalPaid.toLocaleString()} · {t('finance.balance')}{' '}
                    <span className={remainingBalance > 0 ? 'text-coral font-semibold' : 'text-emerald-700 font-semibold'}>
                      {remainingBalance.toLocaleString()} {settings.currency}
                    </span>
                  </p>
                </div>
                {!showAddPayment && (
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(true)}
                    className="px-3.5 py-2 bg-brand hover:bg-brand-hover text-white font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    {t('finance.addPayment')}
                  </button>
                )}
              </div>

              {showAddPayment && (
                <div className="p-3.5 bg-coral/10 border border-coral/30 rounded-xl space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={payAmount || ''}
                      onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                      placeholder={t('finance.amountPlaceholder', { currency: settings.currency })}
                      className="w-full px-2.5 py-2 bg-white border border-line rounded-lg font-mono text-xs"
                    />
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentRecord['paymentMethod'])}
                      className="w-full px-2.5 py-2 bg-white border border-line rounded-lg text-xs"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Telebirr / Mobile Money">Telebirr / Mobile Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit/Debit Card">Credit/Debit Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                    <input
                      type="text"
                      placeholder={t('finance.referenceOptional')}
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-line rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleRecordPayment}
                      className="w-full py-2 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      {t('finance.savePayment')}
                    </button>
                  </div>
                </div>
              )}

              {(activeJob.payments || []).length > 0 ? (
                <div className="space-y-1.5">
                  {activeJob.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-sand/40 border border-line rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-ink">{p.paymentMethod}</span>
                        <span className="text-ink-muted/70 mx-2">·</span>
                        <span className="text-ink-muted font-mono text-[11px]">{p.date}</span>
                        {p.reference && (
                          <span className="text-ink-muted/70 text-[11px] ml-2 font-mono">Ref: {p.reference}</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        +{p.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted/70 italic">{t('finance.noPayments')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-line p-12 text-center text-ink-muted/70">
            <Car className="w-10 h-10 mx-auto text-line mb-2" />
            <p className="text-sm font-semibold text-ink">{t('finance.selectVehicle')}</p>
            <p className="text-xs mt-1">{t('finance.selectVehicleDesc')}</p>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
