import React, { useState } from 'react';
import { JobRecord, PaymentRecord, PriceItem, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { PriceItemPicker } from './PriceItemPicker';
import {
  X,
  Download,
  Printer,
  Check,
  Send,
  CreditCard,
  Car,
} from 'lucide-react';

interface FinanceCostModalProps {
  job: JobRecord;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onJobUpdated: (job: JobRecord) => void;
}

export const FinanceCostModal: React.FC<FinanceCostModalProps> = ({
  job,
  isOpen,
  onClose,
  currentUser,
  onJobUpdated,
}) => {
  const settings = StorageService.getSettings();
  const catalog = StorageService.getPriceItems();

  const [items, setItems] = useState<PriceItem[]>(() => {
    if (job.priceItems && job.priceItems.length > 0) return [...job.priceItems];
    const legacy: PriceItem[] = [];
    if (job.laborCost > 0) {
      legacy.push({
        id: `legacy-labor-${job.id}`,
        name: job.repairDescription || 'Workshop Labor',
        amount: job.laborCost,
        action: 'Repair',
      });
    }
    (job.spareParts || []).forEach((part) => {
      legacy.push({ id: part.id, name: part.name, amount: part.totalCost, action: 'Replace' });
    });
    if (job.additionalServiceCost > 0) {
      legacy.push({
        id: `legacy-additional-${job.id}`,
        name: 'Additional Diagnostics & Quality Checks',
        amount: job.additionalServiceCost,
        action: 'Repair',
      });
    }
    if (job.otherCharges > 0) {
      legacy.push({
        id: `legacy-other-${job.id}`,
        name: 'Other Charges',
        amount: job.otherCharges,
        action: 'Repair',
      });
    }
    return legacy;
  });
  const [payments, setPayments] = useState<PaymentRecord[]>(job.payments || []);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentRecord['paymentMethod']>('Cash');
  const [payReference, setPayReference] = useState('');

  if (!isOpen) return null;

  const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const effectiveTotal = total > 0 ? total : job.finalApprovedPrice || job.totalEstimatedCost;
  const remainingBalance = Math.max(0, effectiveTotal - totalPaid);

  const handleRecordPayment = () => {
    if (payAmount <= 0) return;
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      recordedBy: currentUser.name,
      reference: payReference.trim() || undefined,
    };
    setPayments([...payments, newPayment]);
    setShowAddPayment(false);
    setPayAmount(0);
    setPayReference('');
  };

  const saveJobData = (shareWithManager: boolean) => {
    const paymentStatus =
      totalPaid <= 0 ? 'Unpaid' : totalPaid >= effectiveTotal && effectiveTotal > 0 ? 'Paid' : 'Partially Paid';

    let nextStatus = job.status;
    if (
      shareWithManager &&
      (job.status === 'Received' ||
        job.status === 'Awaiting Inspection' ||
        job.status === 'Awaiting Quotation Approval')
    ) {
      nextStatus = 'Ready to Start';
    }

    const updatedJob: JobRecord = {
      ...job,
      laborCost: total,
      sparePartsCost: 0,
      additionalServiceCost: 0,
      otherCharges: 0,
      discount: 0,
      taxRate: 0,
      totalEstimatedCost: total,
      finalApprovedPrice: total,
      actualFinalCost: total,
      priceItems: items,
      quotationStatus: shareWithManager ? 'Approved' : job.quotationStatus || 'Draft',
      quotationDate: job.quotationDate || new Date().toISOString().substring(0, 10),
      payments,
      paymentStatus,
      status: nextStatus,
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: shareWithManager ? 'Price Set & Sent to Manager' : 'Price Updated',
          performedBy: currentUser.name,
          userRole: currentUser.role,
          details: `Repair price set to ${total.toLocaleString()} ${settings.currency} (${items
            .map((i) => i.name)
            .join(', ') || 'no items'}).`,
          type: 'price',
        },
        ...(job.auditTrail || []),
      ],
    };

    const saved = StorageService.saveJobPricing(job.id, updatedJob);
    if (!saved) {
      alert('You do not have permission to set prices.');
      return;
    }

    if (shareWithManager) {
      StorageService.addNotification({
        targetRole: 'manager',
        title: 'Price Ready for Assignment',
        message: `${job.vehicleMake} ${job.vehicleModel} (${job.plateNumber}) price set to ${total.toLocaleString()} ${settings.currency}. Ready for a team.`,
        jobId: job.id,
        jobNumber: job.jobNumber,
        type: 'approval',
      });
    }

    onJobUpdated(updatedJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-line">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between gap-2 bg-sand/40 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-brand text-white font-bold">
                {job.jobNumber}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-ink">Set Price</h2>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {job.plateNumber} · {job.vehicleMake} {job.vehicleModel} · {job.customerName}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => PdfService.generateQuotationPdf(job, settings)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/40 rounded-lg transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-brand" />
              <span className="hidden sm:inline">Quotation</span>
            </button>
            <button
              type="button"
              onClick={() => PdfService.generateInvoicePdf(job, settings)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/40 rounded-lg transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-muted/70 hover:text-ink hover:bg-sand/60 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          <div className="p-3 bg-coral/10 rounded-xl border border-coral/30 text-xs">
            <span className="font-bold text-brand">Reported problem: </span>
            <span className="text-ink">{job.customerProblem || 'No defect described.'}</span>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-ink border-b pb-1.5">Price items</h3>
            <PriceItemPicker
              catalog={catalog}
              value={items}
              onChange={setItems}
              currency={settings.currency}
            />
          </div>

          {/* Payments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1.5">
              <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-ink-muted" />
                <span>Payments</span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-muted">
                  Paid <strong className="font-mono text-emerald-700">{totalPaid.toLocaleString()}</strong> · Balance{' '}
                  <strong className={`font-mono ${remainingBalance > 0 ? 'text-coral' : 'text-emerald-700'}`}>
                    {remainingBalance.toLocaleString()}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPayment(true)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-1.5">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-sand/40 border border-line rounded-lg flex items-center justify-between text-xs"
                  >
                    <span>
                      <span className="font-semibold text-ink">{p.paymentMethod}</span>
                      <span className="text-ink-muted/70 mx-2 font-mono text-[11px]">{p.date}</span>
                      {p.reference && <span className="text-ink-muted/70 text-[11px] font-mono">Ref: {p.reference}</span>}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      +{p.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ink-muted/70 text-xs italic">No payments recorded yet.</p>
            )}

            {showAddPayment && (
              <div className="p-3.5 bg-coral/10 border border-coral/30 rounded-xl">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    placeholder={`Amount (${settings.currency})`}
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
                    placeholder="Reference (optional)"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-line rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleRecordPayment}
                    className="w-full py-2 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-sand/40 rounded-b-2xl flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-ink bg-white border border-line hover:bg-sand/50 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveJobData(false)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-ink bg-sand hover:bg-line rounded-xl transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Price</span>
          </button>
          <button
            type="button"
            onClick={() => saveJobData(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>Save & Send to Manager</span>
          </button>
        </div>
      </div>
    </div>
  );
};
