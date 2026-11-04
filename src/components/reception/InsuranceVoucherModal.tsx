import React, { useEffect, useState } from 'react';
import { JobRecord } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { DocumentShareButton } from '../common/DocumentShareButton';
import { useLanguage } from '../../i18n/LanguageContext';
import { Download, ShieldCheck, FileText, Wallet } from 'lucide-react';

interface InsuranceVoucherPanelProps {
  job: JobRecord;
}

/**
 * Insurance payment voucher shown as a page inside the vehicle job card.
 * It is no longer a separate reception modal: every claim lives with its job.
 */
export const InsuranceVoucherPanel: React.FC<InsuranceVoucherPanelProps> = ({ job }) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const totalPaid = (job.payments || []).reduce((acc, p) => acc + p.amount, 0);
  const effectiveTotal = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
  const balance = Math.max(0, effectiveTotal - totalPaid);

  useEffect(() => {
    const { blob } = PdfService.generateInsurancePaymentPdf(job, settings, { download: false });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [job.id]);

  const summary = [
    { label: t('jobDetail.insurance'), value: job.hasInsurance ? job.insuranceCompany || t('jobDetail.insured') : t('jobDetail.directCustomer') },
    { label: t('jobDetail.claimNumber'), value: job.claimNumber || t('common.na') },
    { label: t('jobDetail.estimatedCost'), value: `${effectiveTotal.toLocaleString()} ${settings.currency}` },
    { label: t('jobDetail.totalPaid'), value: `${totalPaid.toLocaleString()} ${settings.currency}` },
    { label: t('jobDetail.remainingBalance'), value: `${balance.toLocaleString()} ${settings.currency}` },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink truncate">{t('reports.insuranceVoucher')}</p>
            <p className="text-[11px] text-ink-muted truncate">
              {job.jobNumber} · {job.plateNumber} · {job.customerName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <DocumentShareButton
            title={`${t('reports.insuranceVoucher')} — ${job.jobNumber}`}
            text={`${t('reports.insuranceVoucher')} · ${job.jobNumber} · ${job.plateNumber} · ${job.vehicleMake} ${job.vehicleModel}\n${settings.garageName} · ${settings.phone}`}
            getPdf={() => PdfService.generateInsurancePaymentPdf(job, settings, { download: false })}
          />
          <button
            type="button"
            onClick={() => PdfService.generateInsurancePaymentPdf(job, settings)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            title={t('recorder.exportPdfTitle')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('common.exportPdf')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {summary.map((item) => (
          <div key={item.label} className="p-2.5 bg-sand/40 border border-line rounded-xl min-w-0">
            <p className="text-[10px] text-ink-muted">{item.label}</p>
            <p className="text-[11px] font-bold text-ink mt-0.5 truncate" title={item.value}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <FileText className="w-3.5 h-3.5" />
        <span>{t('recorder.insurancePaymentHint')}</span>
        <Wallet className="w-3.5 h-3.5 ml-auto" />
      </div>

      <div className="border border-line rounded-xl overflow-hidden bg-white h-[58vh] min-h-[340px]">
        {pdfUrl ? (
          <iframe
            key={pdfUrl}
            title={t('reports.insuranceVoucher')}
            src={pdfUrl}
            className="w-full h-full"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-line" />
            <p className="text-xs text-ink-muted">{t('recorder.insurancePaymentHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
