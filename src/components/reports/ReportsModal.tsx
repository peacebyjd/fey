import React, { useState } from 'react';
import { JobRecord, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { useLanguage } from '../../i18n/LanguageContext';
import { DocumentShareButton } from '../common/DocumentShareButton';
import {
  X,
  Download,
  FileText,
  Receipt,
  Wrench,
  History,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobRecord[];
  currentUser: User;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  jobs,
}) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [downloaded, setDownloaded] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const flash = (name: string) => {
    setDownloaded(`${name} ${t('reports.downloaded')}`);
    setTimeout(() => setDownloaded(null), 3000);
  };

  const vehicleDocs = [
    {
      id: 'quotation',
      name: t('reports.quotation'),
      desc: t('reports.quotationDesc'),
      icon: <FileText className="w-4 h-4" />,
      run: () => currentJob && PdfService.generateQuotationPdf(currentJob, settings),
      share: () => PdfService.generateQuotationPdf(currentJob!, settings, { download: false }),
    },
    {
      id: 'jobcard',
      name: t('reports.jobCard'),
      desc: t('reports.jobCardDesc'),
      icon: <Wrench className="w-4 h-4" />,
      run: () => currentJob && PdfService.generateRepairJobCardPdf(currentJob, settings),
      share: () => PdfService.generateRepairJobCardPdf(currentJob!, settings, { download: false }),
    },
    {
      id: 'invoice',
      name: t('reports.invoice'),
      desc: t('reports.invoiceDesc'),
      icon: <Receipt className="w-4 h-4" />,
      run: () => currentJob && PdfService.generateInvoicePdf(currentJob, settings),
      share: () => PdfService.generateInvoicePdf(currentJob!, settings, { download: false }),
    },
    {
      id: 'insurance',
      name: t('reports.insuranceVoucher'),
      desc: t('reports.insuranceVoucherDesc'),
      icon: <ShieldCheck className="w-4 h-4" />,
      run: () => currentJob && PdfService.generateInsurancePaymentPdf(currentJob, settings),
      share: () => PdfService.generateInsurancePaymentPdf(currentJob!, settings, { download: false }),
    },
    {
      id: 'history',
      name: t('reports.vehicleHistory'),
      desc: t('reports.vehicleHistoryDesc'),
      icon: <History className="w-4 h-4" />,
      run: () => currentJob && PdfService.generateQuotationPdf(currentJob, settings),
      share: () => PdfService.generateQuotationPdf(currentJob!, settings, { download: false }),
    },
  ];

  const allDocs = [
    {
      id: 'daily',
      name: t('reports.dailySummary'),
      desc: t('reports.dailySummaryDesc'),
      icon: <FileSpreadsheet className="w-4 h-4" />,
      run: () => PdfService.generateDailySummaryPdf(jobs, settings),
      share: () => PdfService.generateDailySummaryPdf(jobs, settings, { download: false }),
    },
    {
      id: 'financial',
      name: t('reports.financialSummary'),
      desc: t('reports.financialSummaryDesc'),
      icon: <Receipt className="w-4 h-4" />,
      run: () => PdfService.generateDailySummaryPdf(jobs, settings),
      share: () => PdfService.generateDailySummaryPdf(jobs, settings, { download: false }),
    },
  ];

  const handleRun = (doc: { id: string; name: string; run: () => void }) => {
    doc.run();
    flash(doc.name);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-line">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-sand/40 rounded-t-2xl">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink">{t('reports.title')}</h2>
            <p className="text-xs text-ink-muted">{t('reports.description')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted/70 hover:text-ink hover:bg-sand/60 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {downloaded && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-sm text-emerald-900 font-semibold">
              {downloaded}
            </div>
          )}

          {/* Vehicle documents */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink">{t('reports.oneVehicle')}</h3>
              <select
                value={currentJob?.id || ''}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full sm:w-72 px-3 py-2 text-xs border border-line rounded-lg bg-white font-mono focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobNumber} — {j.plateNumber} ({j.vehicleMake} {j.vehicleModel})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {vehicleDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-line bg-white flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-sand flex items-center justify-center text-brand shrink-0">
                      {doc.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{doc.name}</p>
                      <p className="text-[11px] text-ink-muted truncate">{doc.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {currentJob && (
                      <DocumentShareButton
                        title={`${doc.name} — ${currentJob.jobNumber}`}
                        text={`${doc.name} · ${currentJob.jobNumber} · ${currentJob.plateNumber} · ${currentJob.vehicleMake} ${currentJob.vehicleModel}\n${settings.garageName} · ${settings.phone}`}
                        getPdf={doc.share}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRun(doc)}
                      disabled={!currentJob}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold text-xs shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All vehicles */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-ink">{t('reports.allVehicles')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-line bg-white flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-sand flex items-center justify-center text-brand shrink-0">
                      {doc.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{doc.name}</p>
                      <p className="text-[11px] text-ink-muted truncate">{doc.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DocumentShareButton
                      title={doc.name}
                      text={`${doc.name}\n${settings.garageName} · ${settings.phone}`}
                      getPdf={doc.share}
                    />
                    <button
                      type="button"
                      onClick={() => handleRun(doc)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold text-xs shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-sand/40 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/50 rounded-xl cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
