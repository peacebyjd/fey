import React, { useEffect, useMemo, useState } from 'react';
import { PriceItem, User } from '../../types';
import { StorageService } from '../../services/storage';
import { PdfService, RepairEstimateInput } from '../../services/pdfService';
import { StampService } from '../../services/stampService';
import { BrandMark } from '../common/BrandMark';
import { CompactSignaturePad } from '../common/CompactSignaturePad';
import { DocumentShareButton } from '../common/DocumentShareButton';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Download,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface RepairEstimatePageProps {
  currentUser: User;
}

interface CostRowState {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface EstimateDraft {
  estimateNumber: string;
  date: string;
  inspectionDate: string;
  accidentDate: string;
  ownerName: string;
  vehicleModel: string;
  plateNumber: string;
  insuranceCompany: string;
  rows: CostRowState[];
  includeVat: boolean;
  vatRate: number;
  notes: string;
  preparedByName: string;
  signature: string;
}

const DRAFT_KEY = 'feyamet_repair_estimate_draft_v1';

const DEFAULT_TERMS =
  'This estimate is prepared from a physical inspection of the vehicle. Prices cover only the parts and labor listed above. Hidden damage found after dismantling will be estimated separately. The estimate is valid for 14 days from the inspection date.';

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

const prettyDate = (value: string) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const makeEstimateNumber = () =>
  `EST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

const makeRow = (description = '', unitPrice = ''): CostRowState => ({
  id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  description,
  quantity: '1',
  unitPrice,
});

const blankForm = (preparedByName: string, vatRate: number): EstimateDraft => ({
  estimateNumber: makeEstimateNumber(),
  date: today(),
  inspectionDate: today(),
  accidentDate: '',
  ownerName: '',
  vehicleModel: '',
  plateNumber: '',
  insuranceCompany: '',
  rows: [makeRow('Body Paint', '2000'), makeRow('Fender Body Work', '2000')],
  includeVat: true,
  vatRate,
  notes: DEFAULT_TERMS,
  preparedByName,
  signature: '',
});

const readDraft = (preparedByName: string, vatRate: number): EstimateDraft => {
  const blank = blankForm(preparedByName, vatRate);
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return blank;
    const parsed = JSON.parse(raw) as Partial<EstimateDraft>;
    return {
      ...blank,
      ...parsed,
      rows:
        Array.isArray(parsed.rows) && parsed.rows.length > 0 ? parsed.rows : blank.rows,
    };
  } catch {
    return blank;
  }
};

const money = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 2 });

const labelClass =
  'block text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted/90 mb-1';
const sheetInputClass =
  'w-full bg-transparent border-b border-line px-0.5 py-1 text-[11.5px] font-medium text-ink placeholder:text-ink-muted/40 hover:border-ink-muted/40 focus:outline-none focus:border-brand focus:ring-0 transition-colors';

const SectionHeading: React.FC<{
  children: React.ReactNode;
  step?: string;
  action?: React.ReactNode;
}> = ({ children, step, action }) => (
  <div className="flex items-center gap-2.5 mb-2.5">
    {step && (
      <span className="h-5 w-5 rounded-md bg-brand/10 border border-brand/15 text-brand text-[8px] font-bold flex items-center justify-center shrink-0 tabular-nums">
        {step}
      </span>
    )}
    <h2 className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-brand whitespace-nowrap">
      {children}
    </h2>
    <span className="flex-1 h-px bg-line" aria-hidden="true" />
    {action}
  </div>
);

/**
 * Standalone official repair & insurance cost estimate sheet.
 * The page doubles as the printable A4 form, so Print uses the browser
 * dialog on this layout and the PDF is generated from the same data.
 */
export const RepairEstimatePage: React.FC<RepairEstimatePageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const settings = StorageService.getSettings();
  const priceItems = StorageService.getPriceItems();

  const [form, setForm] = useState<EstimateDraft>(() =>
    readDraft(currentUser.name, settings.defaultTaxRate)
  );
  const [stampImage, setStampImage] = useState<string>(() =>
    StampService.getSavedStamp() || StampService.getSampleStamp()
  );
  const [isCustomStamp, setIsCustomStamp] = useState<boolean>(
    () => !!StampService.getSavedStamp()
  );

  // Keep an in-progress estimate on this device so tab switches never lose it.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        // Storage full or blocked: the form still works in memory.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form]);

  const update = (patch: Partial<EstimateDraft>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const totals = useMemo(() => {
    const subtotal = form.rows.reduce((sum, row) => {
      const quantity = parseFloat(row.quantity) || 0;
      const unitPrice = parseFloat(row.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
    const vat = form.includeVat ? Math.round(subtotal * (form.vatRate / 100)) : 0;
    return { subtotal, vat, total: subtotal + vat };
  }, [form.rows, form.includeVat, form.vatRate]);

  const buildInput = (): RepairEstimateInput => ({
    estimateNumber: form.estimateNumber,
    date: form.date,
    inspectionDate: form.inspectionDate,
    accidentDate: form.accidentDate,
    ownerName: form.ownerName,
    vehicleModel: form.vehicleModel,
    plateNumber: form.plateNumber,
    insuranceCompany: form.insuranceCompany,
    rows: form.rows.map((row) => ({
      description: row.description,
      quantity: parseFloat(row.quantity) || 0,
      unitPrice: parseFloat(row.unitPrice) || 0,
    })),
    includeVat: form.includeVat,
    vatRate: form.vatRate,
    notes: form.notes,
    preparedByName: form.preparedByName,
    signature: form.signature,
    stampImage: stampImage || undefined,
    standardPrices: priceItems.map((item) => ({
      label: item.action ? `${item.name} — ${item.action}` : item.name,
      amount: item.amount,
    })),
  });

  const handleReset = () => {
    localStorage.removeItem(DRAFT_KEY);
    setForm(blankForm(currentUser.name, settings.defaultTaxRate));
  };

  const handleStampUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const normalized = await StampService.normalizeStamp(file);
      StampService.saveStamp(normalized);
      setStampImage(normalized);
      setIsCustomStamp(true);
    } catch {
      // Unreadable image: keep the current stamp.
    }
  };

  const handleUseSampleStamp = () => {
    StampService.clearSavedStamp();
    setStampImage(StampService.getSampleStamp());
    setIsCustomStamp(false);
  };

  const addRow = (description = '', unitPrice = '') =>
    update({ rows: [...form.rows, makeRow(description, unitPrice)] });

  const addPriceItem = (item: PriceItem) => addRow(item.name, String(item.amount));

  const removeRow = (id: string) =>
    update({ rows: form.rows.filter((row) => row.id !== id) });

  const setRow = (id: string, patch: Partial<CostRowState>) =>
    update({
      rows: form.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });

  const shareText = `Repair estimate ${form.estimateNumber} · ${form.ownerName || 'Vehicle owner'} · ${
    form.vehicleModel || 'Vehicle'
  } ${form.plateNumber ? `(${form.plateNumber})` : ''} · ${settings.currency} ${money(
    totals.total
  )}\n${settings.garageName} · ${settings.phone}`;

  return (
    <div className="space-y-3">
      {/* Section heading + document actions */}
      <div className="no-print flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-lg border border-line text-brand flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[13px] sm:text-sm font-bold text-ink leading-tight truncate">
              {t('estimate.title')}
            </h1>
            <p className="mt-0.5 text-[10.5px] text-ink-muted leading-snug line-clamp-2">
              {t('estimate.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            title={t('estimate.newEstimate')}
            className="flex items-center justify-center gap-1.5 min-h-9 px-2.5 border border-line bg-white text-ink-muted hover:text-brand hover:border-brand/40 text-[11px] font-semibold rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('estimate.newEstimate')}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 min-h-9 px-2.5 border border-line bg-white text-ink hover:border-ink-muted/40 hover:bg-sand/20 text-[11px] font-semibold rounded-lg transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('common.print')}</span>
          </button>

          <DocumentShareButton
            title={`Repair Estimate — ${form.estimateNumber}`}
            text={shareText}
            getPdf={() =>
              PdfService.generateRepairEstimatePdf(buildInput(), settings, { download: false })
            }
          />

          <button
            type="button"
            onClick={() => PdfService.generateRepairEstimatePdf(buildInput(), settings)}
            className="flex items-center justify-center gap-1.5 min-h-9 px-3 bg-[#800020] hover:bg-[#600018] text-white text-[11px] font-semibold rounded-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('common.exportPdf')}</span>
          </button>
        </div>
      </div>

      {/* Printable A4 sheet */}
      <div className="estimate-sheet mx-auto w-full max-w-[210mm] bg-white rounded-xl border border-line/80 shadow-[0_1px_3px_rgba(28,25,23,0.06)] overflow-hidden">
        {/* Garage header band */}
        <div className="estimate-band px-4 sm:px-6 pt-3.5 pb-2.5 flex items-start justify-between gap-4 border-b-2 border-[#800020]">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark className="w-7 h-7 shrink-0 rounded-[7px]" />
            <div className="min-w-0">
              <p className="text-[12.5px] sm:text-[13.5px] font-bold tracking-tight text-[#800020] leading-tight truncate">
                {settings.garageName}
              </p>
              <p className="text-[7px] sm:text-[7.5px] uppercase tracking-[0.18em] text-ink-muted leading-tight mt-1">
                Official vehicle repair &amp; insurance cost estimate
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[6.5px] uppercase tracking-[0.16em] text-ink-muted">Estimate no.</p>
            <p className="font-mono text-[11px] font-semibold leading-tight text-ink">
              {form.estimateNumber}
            </p>
            <p className="text-[7.5px] mt-0.5 text-ink-muted tabular-nums">{prettyDate(form.date)}</p>
          </div>
        </div>

        {/* Head office strip */}
        <div className="border-b border-line/80 px-4 sm:px-6 py-1.5 text-[8.5px] text-ink-muted">
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span className="truncate">
              <b className="font-semibold text-ink/90">Head Office:</b> {settings.address}
            </span>
            <span>
              <b className="font-semibold text-ink/90">Phone:</b> {settings.phone}
            </span>
            <span className="truncate">
              <b className="font-semibold text-ink/90">Email:</b> {settings.email}
            </span>
            <span>
              <b className="font-semibold text-ink/90">TIN No:</b> {settings.taxId}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-4">
          {/* Client & vehicle */}
          <section>
            <SectionHeading step="01">Client &amp; vehicle information</SectionHeading>
            <div className="grid gap-x-5 gap-y-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass} htmlFor="estimate-owner">
                  Owner / Driver Name
                </label>
                <input
                  id="estimate-owner"
                  value={form.ownerName}
                  onChange={(e) => update({ ownerName: e.target.value })}
                  placeholder="Full name"
                  className={sheetInputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="estimate-model">
                  Vehicle Model
                </label>
                <input
                  id="estimate-model"
                  value={form.vehicleModel}
                  onChange={(e) => update({ vehicleModel: e.target.value })}
                  placeholder="e.g. Toyota Corolla 2018"
                  className={sheetInputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="estimate-plate">
                  License Plate No.
                </label>
                <input
                  id="estimate-plate"
                  value={form.plateNumber}
                  onChange={(e) => update({ plateNumber: e.target.value })}
                  placeholder="e.g. AA 2 A12345"
                  className={sheetInputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="estimate-insurer">
                  Insurance Company
                </label>
                <input
                  id="estimate-insurer"
                  value={form.insuranceCompany}
                  onChange={(e) => update({ insuranceCompany: e.target.value })}
                  placeholder="e.g. Nyala Insurance"
                  className={sheetInputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="estimate-date">
                  Estimate Date
                </label>
                <input
                  id="estimate-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => update({ date: e.target.value })}
                  className={sheetInputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="estimate-accident">
                  Date of Accident
                </label>
                <input
                  id="estimate-accident"
                  type="date"
                  value={form.accidentDate}
                  onChange={(e) => update({ accidentDate: e.target.value })}
                  className={sheetInputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="estimate-inspection">
                  Inspection Date
                </label>
                <input
                  id="estimate-inspection"
                  type="date"
                  value={form.inspectionDate}
                  onChange={(e) => update({ inspectionDate: e.target.value })}
                  className={sheetInputClass}
                />
              </div>
            </div>
          </section>

          {/* Cost breakdown */}
          <section>
            <SectionHeading
              step="02"
              action={
                <button
                  type="button"
                  onClick={() => addRow()}
                  className="no-print flex items-center gap-1 h-6 px-2 text-[10px] font-semibold text-brand border border-brand/25 hover:border-brand/60 hover:bg-brand/5 rounded-md transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add line</span>
                </button>
              }
            >
              Cost breakdown — parts &amp; labor
            </SectionHeading>

            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-line bg-sand/30 text-[8px] uppercase tracking-[0.12em] text-ink-muted">
                    <th className="w-8 px-2 py-2 font-semibold">No.</th>
                    <th className="px-1.5 py-1.5 font-semibold">Description of parts &amp; labor work</th>
                    <th className="w-12 px-1.5 py-1.5 font-semibold text-right">Qty</th>
                    <th className="w-24 px-1.5 py-1.5 font-semibold text-right">Unit price</th>
                    <th className="w-24 px-1.5 py-1.5 font-semibold text-right">Total</th>
                    <th className="no-print w-7" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {form.rows.map((row, index) => {
                    const lineTotal =
                      (parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0);
                    return (
                      <tr key={row.id} className="group hover:bg-sand/20 transition-colors">
                        <td className="px-2 py-0 text-[10px] font-mono text-ink-muted/70 tabular-nums">
                          {index + 1}
                        </td>
                        <td className="px-1.5 py-0">
                          <input
                            value={row.description}
                            onChange={(e) => setRow(row.id, { description: e.target.value })}
                            placeholder="Part or labor work"
                            aria-label={`Line ${index + 1} description`}
                            className="w-full bg-transparent px-1 py-1.5 text-[11px] text-ink placeholder:text-ink-muted/40 rounded focus:outline-none focus:bg-sand/20 focus:ring-0"
                          />
                        </td>
                        <td className="px-1.5 py-0">
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={row.quantity}
                            onChange={(e) => setRow(row.id, { quantity: e.target.value })}
                            aria-label={`Line ${index + 1} quantity`}
                            className="w-full bg-transparent px-1 py-1.5 text-[11px] font-medium text-ink text-right tabular-nums rounded focus:outline-none focus:bg-sand/20 focus:ring-0"
                          />
                        </td>
                        <td className="px-1.5 py-0">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.unitPrice}
                            onChange={(e) => setRow(row.id, { unitPrice: e.target.value })}
                            aria-label={`Line ${index + 1} unit price`}
                            className="w-full bg-transparent px-1 py-1.5 text-[11px] font-medium text-ink text-right tabular-nums rounded focus:outline-none focus:bg-sand/20 focus:ring-0"
                          />
                        </td>
                        <td className="px-1.5 py-0 text-right text-[11px] font-semibold text-ink whitespace-nowrap tabular-nums">
                          {money(lineTotal)}
                        </td>
                        <td className="no-print px-0.5 py-0 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            aria-label={`Remove line ${index + 1}`}
                            className="p-1 rounded text-ink-muted/50 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-3 text-[10.5px] italic text-ink-muted">
                        No cost lines yet. Use “Add line” or tap a fixed price below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Fixed prices + totals */}
          <section className="grid gap-4 xl:grid-cols-[1fr_16rem] xl:items-start">
            <div>
              <SectionHeading step="03">Fixed workshop prices — tap to add</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {priceItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addPriceItem(item)}
                    className="group flex items-center justify-between gap-2 min-h-9 rounded-lg border border-line bg-white px-2.5 py-1.5 text-left text-[10px] text-ink hover:border-brand/50 hover:bg-brand/5 transition-colors cursor-pointer"
                  >
                    <span className="min-w-0 truncate">
                      {item.name}
                      {item.action ? (
                        <span className="text-ink-muted group-hover:text-brand/70"> · {item.action}</span>
                      ) : null}
                    </span>
                    <span className="font-mono font-bold whitespace-nowrap tabular-nums text-brand">
                      {settings.currency} {money(item.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full xl:w-64 shrink-0 rounded-xl border border-line bg-sand/20 p-3">
              <SectionHeading step="04">Summary</SectionHeading>
              <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 text-[10.5px]">
                <span className="text-ink-muted">Subtotal</span>
                <span className="font-semibold text-ink tabular-nums">
                  {settings.currency} {money(totals.subtotal)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 text-[10.5px]">
                <span className="text-ink-muted">
                  VAT / Tax ({form.includeVat ? form.vatRate : 0}%)
                </span>
                <span className="font-semibold text-ink tabular-nums">
                  {settings.currency} {money(totals.vat)}
                </span>
              </div>
              <div className="no-print flex items-center justify-between gap-2 py-1.5">
                <label className="flex items-center gap-1.5 text-[9.5px] font-semibold text-ink-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.includeVat}
                    onChange={(e) => update({ includeVat: e.target.checked })}
                    className="w-3.5 h-3.5 accent-[#800020] cursor-pointer"
                  />
                  Apply VAT
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={form.vatRate}
                    onChange={(e) => update({ vatRate: parseFloat(e.target.value) || 0 })}
                    aria-label="VAT rate"
                    className="w-12 px-1 py-0.5 text-[10px] text-right tabular-nums border border-line rounded-md bg-white hover:border-ink-muted/40 focus:outline-none focus:border-brand transition-colors"
                  />
                  <span className="text-[9.5px] text-ink-muted">%</span>
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 rounded-lg bg-[#800020] px-2.5 py-2">
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/80">
                  Grand total
                </span>
                <span className="text-[14px] font-bold whitespace-nowrap text-white tabular-nums">
                  {settings.currency} {money(totals.total)}
                </span>
              </div>
              <p className="mt-1.5 text-[8px] text-ink-muted text-right">
                Valid for {settings.quoteValidityDays || 14} days
              </p>
            </div>
          </section>

          {/* Terms */}
          <section>
            <SectionHeading step="05">Terms &amp; declaration</SectionHeading>
            <textarea
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              aria-label="Estimate terms and declaration"
              className="w-full resize-none rounded-md border border-line/80 bg-transparent px-2 py-1.5 text-[9.5px] leading-relaxed text-ink-muted hover:border-ink-muted/30 focus:outline-none focus:border-brand/60 transition-colors"
            />
          </section>

          {/* Signature & stamp */}
          <section className="grid gap-3 lg:grid-cols-[1fr_180px] lg:items-end pt-1">
            <div className="min-w-0">
              <SectionHeading step="06">Authorization</SectionHeading>

              <div className="no-print">
                <CompactSignaturePad
                  label="Garage Representative Signature"
                  subLabel="Required"
                  value={form.signature}
                  onChange={(value) => update({ signature: value })}
                  signerName={form.preparedByName}
                />
              </div>

              <div className="print-only">
                <div className="h-12 flex items-end">
                  {form.signature.startsWith('data:image/') && (
                    <img
                      src={form.signature}
                      alt="Garage representative signature"
                      className="max-h-12"
                    />
                  )}
                </div>
                <div className="border-t border-ink/40 pt-1 text-[8.5px] uppercase tracking-wider text-ink-muted">
                  Garage representative signature
                </div>
              </div>

              <div className="mt-2">
                <label className={labelClass} htmlFor="estimate-prepared-by">
                  Name &amp; position (printed)
                </label>
                <input
                  id="estimate-prepared-by"
                  value={form.preparedByName}
                  onChange={(e) => update({ preparedByName: e.target.value })}
                  placeholder="Authorized staff"
                  className={sheetInputClass}
                />
              </div>
            </div>

            <div className="rounded-lg border border-line/80 px-2 py-2 flex flex-col items-center justify-center min-h-[150px] sm:w-[168px]">
              <span className="text-[7.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Official stamp / seal
              </span>
              {stampImage ? (
                <img
                  src={stampImage}
                  alt="Feyamet official stamp"
                  className="mt-1 w-[104px] h-[104px] object-contain -rotate-6 opacity-90 mix-blend-multiply"
                />
              ) : (
                <div className="mt-2 text-[9px] italic text-ink-muted">Stamp image unavailable</div>
              )}
              <span className="text-[7.5px] font-semibold uppercase tracking-wider text-ink-muted">
                {isCustomStamp ? 'Scanned garage stamp' : 'Blue sample stamp'}
              </span>
              <div className="no-print mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                <label className="text-[7.5px] font-semibold uppercase tracking-[0.12em] text-brand/90 cursor-pointer hover:text-brand hover:underline">
                  Upload scan
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleStampUpload}
                    className="hidden"
                  />
                </label>
                {isCustomStamp && (
                  <button
                    type="button"
                    onClick={handleUseSampleStamp}
                    className="text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted hover:text-brand cursor-pointer"
                  >
                    Use sample
                  </button>
                )}
              </div>
            </div>
          </section>

          <p className="border-t border-line/80 pt-2 text-center text-[7.5px] leading-relaxed text-ink-muted/80">
            {settings.garageName} · {settings.phone} · {settings.email} · {settings.address}
          </p>
        </div>
      </div>

      <p className="no-print text-center text-[9.5px] text-ink-muted/80">
        Print or export on A4: the sheet is accepted by insurance companies and other garages for
        price comparison.
      </p>
    </div>
  );
};
