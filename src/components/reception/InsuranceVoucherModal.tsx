import React, { useEffect, useState } from 'react';
import { JobRecord } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { DocumentShareButton } from '../common/DocumentShareButton';
import { useLanguage } from '../../i18n/LanguageContext';
import { X, Download, ShieldCheck } from 'lucide-react';

interface InsuranceVoucherModalProps {
  isOpen: boolean;
  jobs: JobRecord[];
  initialJob?: JobRecord | null;
  onClose: () => void;
}

export const InsuranceVoucherModal: React.FC<InsuranceVoucherModalProps> = ({
  isOpen,
  jobs,
  initialJob,
  onClose,
}) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const [jobId, setJobId] = useState<string>(initialJob?.id || jobs[0]?.id || '');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const job = jobs.find((j) => j.id === jobId) || jobs[0];

  useEffect(() => {
    if (isOpen && initialJob) setJobId(initialJob.id);
  }, [isOpen, initialJob]);

  useEffect(() => {
    if (!isOpen || !job) {
      setPdfUrl(null);
      return;
    }
    const { blob } = PdfService.generateInsurancePaymentPdf(job, settings, { download: false });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [isOpen, job?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 p-2 sm:p-4 flex items-center justify-center overflow-hidden no-print">
      <div className="w-full max-w-4xl h-full max-h-[96vh] flex flex-col">
        {/* Toolbar */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 bg-white rounded-2xl border border-line shadow-lg px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-coral/10 text-brand flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">{t('reports.insuranceVoucher')}</p>
              <p className="text-[11px] text-ink-muted truncate">
                {job ? `${job.jobNumber} · ${job.plateNumber}` : t('recorder.noRecords')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={job?.id || ''}
              onChange={(e) => setJobId(e.target.value)}
              disabled={jobs.length === 0}
              className="px-2 py-2 text-[11px] border border-line rounded-lg bg-white font-mono max-w-[220px] focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer disabled:opacity-50"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber} — {j.plateNumber}
                </option>
              ))}
            </select>

            {job && (
              <DocumentShareButton
                title={`${t('reports.insuranceVoucher')} — ${job.jobNumber}`}
                text={`${t('reports.insuranceVoucher')} · ${job.jobNumber} · ${job.plateNumber} · ${job.vehicleMake} ${job.vehicleModel}\n${settings.garageName} · ${settings.phone}`}
                getPdf={() => PdfService.generateInsurancePaymentPdf(job, settings, { download: false })}
              />
            )}

            <button
              type="button"
              disabled={!job}
              onClick={() => job && PdfService.generateInsurancePaymentPdf(job, settings)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              title={t('recorder.exportPdfTitle')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('common.exportPdf')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-ink-muted hover:text-ink hover:bg-sand rounded-xl transition cursor-pointer"
              title={t('recorder.closeReview')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voucher page preview */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-line overflow-hidden">
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
    </div>
  );
};
